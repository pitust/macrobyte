music.playTone(Note.F, 100)
basic.pause(100)
music.playTone(Note.E, 100)
basic.pause(100)
music.playTone(Note.F3, 100)

serial.redirectToUSB()
serial.setBaudRate(115200)
if (storage.has('keys')) {
    for (let key of storage.read('keys').toString().split(',')) {
        if (storage.has(key)) configparser.config[key] = storage.read(key).toString()
    }
}
serial.writeString(',Pitch,Roll\n')
let buffer = ''

class Sample {
    constructor(public p: number, public r: number) {}
}

let samplesL: Sample[] = [
    new Sample(46, 74),
    new Sample(46, 82),
    new Sample(46, 74),
    new Sample(129, 91),
    new Sample(51, 65),
    new Sample(124, 102),
    new Sample(54, 89),
    new Sample(125, 91),
    new Sample(104, 135),
    new Sample(74, 45),
]
let samplesB: Sample[] = [new Sample(44, -87), new Sample(39, -86), new Sample(136, -94), new Sample(136, -93)]
let strikeL = 0
let strikeB = 0
let ignorel = false
let ignoreb = false

basic.forever(() => {
    const ns = serial.readString().split('\r').join('\n').split('\n\n').join('\n')
    serial.writeString(ns.split('\n').join('\r\n'))
    buffer += ns
    if (buffer.slice(-8) == ']TRAILER') {
        buffer = buffer.slice(0, -8)
        if (buffer.slice(0, 7) == 'HEADER[') {
            buffer = buffer.slice(7)
            configparser.parseConfigSlice(buffer)
            buffer = ''
            for (let key of Object.keys(configparser.config)) {
                serial.writeString('\r\nWriting key ' + key + ' to persistent storage!')
                storage.write(key, Buffer.fromUTF8(key))
            }
            serial.writeString(
                'e: ' + storage.write('keys', Buffer.fromUTF8(Object.keys(configparser.config).join(',')))
            )
            serial.writeString('\r\nHere is the trailer for the flasher: [[CONFIG_FLASH_DONE]]\r\n')
        } else {
            serial.writeString('\r\nError loading config: header is missing\r\n')
            basic.showString('CE01 | CE01 | CE01')
            while (1) {}
        }
        basic.pause(15)
    } else {
        if (buffer.indexOf('|__reset__|') !== -1) {
            buffer = buffer.split('|__reset__|').slice(-1)[0]
            serial.writeString('\r\n\r\nRESET:\r\n')
        }
    }

    if (input.buttonIsPressed(Button.A)) {
        serial.writeString(`L: ${input.rotation(Rotation.Pitch)},${input.rotation(Rotation.Roll)}\r\n`)
        samplesL.push(new Sample(input.rotation(Rotation.Pitch), input.rotation(Rotation.Roll)))
        while (input.buttonIsPressed(Button.A));
    }
    if (input.buttonIsPressed(Button.B)) {
        serial.writeString(`B: ${input.rotation(Rotation.Pitch)},${input.rotation(Rotation.Roll)}\r\n`)
        samplesB.push(new Sample(input.rotation(Rotation.Pitch), input.rotation(Rotation.Roll)))
        while (input.buttonIsPressed(Button.B));
    }
    let weightL = Infinity
    let weightB = Infinity
    for (let s of samplesL) {
        weightL = Math.min(
            weightL,
            (s.p - input.rotation(Rotation.Pitch)) ** 2 + (s.r - input.rotation(Rotation.Roll)) ** 2
        )
    }
    for (let s of samplesB) {
        weightB = Math.min(
            weightB,
            (s.p - input.rotation(Rotation.Pitch)) ** 2 + (s.r - input.rotation(Rotation.Roll)) ** 2
        )
    }
    if (Math.min(weightL, weightB) > 500) {
        ignorel = false
        ignoreb = false
        return
    }
    if (weightL < weightB) {
        strikeB = 0
        strikeL += 1
        ignoreb = false
        if (strikeL > +(configparser.config.strikeThreshold || '10') && !ignorel) {
            serial.writeString('\r\nL')
            ignorel = true
            music.setVolume(255)
            music.playTone(Note.C, 100)
        }
    } else {
        strikeL = 0
        strikeB += 1
        ignorel = false
        if (strikeB > +(configparser.config.strikeThreshold || '10') && !ignoreb) {
            serial.writeString('\r\nB')
            ignoreb = true
            music.setVolume(255)
            music.playTone(Note.E, 100)
        }
    }
    // serial.writeString(`Data,${input.rotation(Rotation.Pitch)},${input.rotation(Rotation.Roll)}\n`)
})
