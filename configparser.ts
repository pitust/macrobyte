namespace configparser {
    enum LexState {
        Key,
        Value,
        NewLine,
        Quoted,
        PreValue,
        Escaped,
        AfterQuote,
    }
    export const config: StringMap = {}

    export function parseConfigSlice(s: string) {
        let state = LexState.Key
        let vKey = ''
        let vValue = ''
        for (let c of s) {
            switch (state) {
                case LexState.Key:
                    if (c == '\n') break
                    if (c == ':') {
                        state = LexState.PreValue
                    } else vKey += c
                    break
                case LexState.PreValue:
                    if (c == ' ') {
                        break
                    }
                    if (c == '"') {
                        state = LexState.Quoted
                    } else {
                        state = LexState.Value
                        vValue += c
                    }
                    break
                case LexState.Value:
                    if (c == '\n') {
                        config[vKey] = vValue
                        vKey = ''
                        vValue = ''
                        state = LexState.Key
                    } else {
                        vValue += c
                    }
                    break
                case LexState.Quoted:
                    if (c == '\\') {
                        state = LexState.Escaped
                    } else if (c == '"') {
                        config[vKey] = vValue
                        vKey = ''
                        vValue = ''
                        state = LexState.AfterQuote
                    } else {
                        vValue += c
                    }
                    break
                case LexState.Escaped:
                    if (c == '\\') vValue += '\\'
                    else if (c == 'n') vValue += '\n'
                    else control.assert(false, 'Unknown escape \\' + c)
                    state = LexState.Quoted
                    break
                case LexState.AfterQuote:
                    if (c == '\n') {
                        state = LexState.Key
                        break
                    }
                    if (c == ' ') break
                    control.assert(false, `after a quoted string 'c' must be newline`)
                default:
                    control.assert(false, `Unknown Lexstate ${state}`)
            }
        }
        if (state == LexState.Value) {
            config[vKey] = vValue
            vKey = ''
            vValue = ''
        }
        if (
            state == LexState.AfterQuote ||
            state == LexState.Value ||
            state == LexState.Key
        ) {
            if (config.doRead == 'yes') {
                delete config.doRead
                serial.writeString(`\r\n\r\n=== dumped ===\r\n[[DUMP]]\r\n`)
                serial.writeString(JSON.stringify(config))
                serial.writeString(`\r\n[[DUMPEND]]\r\n`)
            }
            return
        }
        control.assert(false, 'Failed to parse the configuration file :(')
    }
}
