import { exec, execSync } from 'child_process'
import { appendFileSync, readFileSync } from 'fs'
import * as minimist from 'minimist'
import { parse, stringify } from 'yaml'
const options = minimist(process.argv.slice(2))
const helpmsg = `${process.argv.slice(0, -2).join(' ')} [...ARGS]

Usage:
 -k, --key      Set the key to provision
 -v, --value    Set the value to provision
 -p, --port     Serial port to provision to
 -s, --set      Set a key=value pair
 -c, --config   Read the configuration from a file
 -r, --read     Read the configuration and display it


NOTE: picocom must be installed and in PATH`
if (options.h || options.help) {
    console.log(helpmsg)
    process.exit(0)
}
function err() {
    console.log(helpmsg)
    process.exit(1)
}
function getarg(s: string): string[] {
    if (s in options) return ([options[s]] as any).flat()
    return []
}
function getopt(s: string, s2: string, fallback: string[] = []): string[] {
    let a = [...getarg(s), ...getarg(s2)]
    if (a.length == 0) return fallback
    return a
}
const map: Record<string, string> = Object.create(null)
if ('k' in options || 'key' in options) {
    const key = getopt('k', 'key')
    const value = getopt('v', 'value')
    if (key.length != 1) err()
    if (value.length != 1) err()
    map[key[0]] = value[0]
}
for (let option of getopt('s', 'set')) {
    let vv = option.split('=')
    if (vv.length != 2) err()
    map[vv[0]] = vv[1]
}
for (let cfile of getopt('c', 'config')) {
    Object.assign(cfile, parse(readFileSync(cfile).toString()))
}
if ('r' in options || 'read' in options) map.doRead = 'yes'
async function delay(s: number) {
    return new Promise(res => setTimeout(res, s))
}
let rc = 0
for (let port of getopt('p', 'port', ['/dev/tty.usbmodem1102'])) {
    ;(async () => {
        rc++
        const e = exec(`picocom ${port} -b 115200 -f no`, {})
        let s = 'HEADER['
        for (let [k, v] of Object.entries(map)) {
            s += `${k}: ${JSON.stringify(v)}\r`
        }
        e.stdin.write(`|__reset__|`)
        await delay(100)
        for (let c of s) {
            await delay(10)
            e.stdin.write(c)
        }
        e.stdin.write(`]TRAILER`)
        let gbuf = ''
        e.stdout.on('data', d => {
            appendFileSync('log.txt', d)
            const s = `${d}`
            gbuf += s
            if (gbuf.includes('[[CONFIG_FLASH_DONE]]')) {
                if ('r' in options || 'read' in options) {
                    execSync('bat -fl yaml', {
                        input: stringify(JSON.parse(gbuf.split('[[DUMP]]')[1].split('[[DUMPEND]]')[0])),
                        stdio: ['pipe', 'inherit']
                    })
                }
                rc--
                if (rc == 0) {
                    console.log('flashing done.')
                    process.exit()
                }
            }
        })
    })()
}
