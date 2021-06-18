#include <stdint.h>
#include "pxt.h"

//% weight=2 color=#002050 icon="\uf287"
//% advanced=true
namespace storage {
    //% help=serial/read-until
    //% blockId=storage_is_present block="storage|is present"
    //% weight=19
    bool has(BoxedString* key) {
        char buf[33];
        buf[key->ascii.length] = 0;
        memcpy(buf, key->ascii.data, key->ascii.length);
        return !!uBit.storage.get(buf);
    }
    //% blockId=storage_is_present block="storage|write"
    int write(BoxedString* key, Buffer b) {
        char buf[33];
        buf[key->ascii.length] = 0;
        memcpy(buf, key->ascii.data, key->ascii.length);
        return uBit.storage.put(buf, b->data, b->length);
    }
    //% blockId=storage_is_present block="storage|read"
    Buffer read(BoxedString* key) {
        char buf[33];
        buf[key->ascii.length] = 0;
        memcpy(buf, key->ascii.data, key->ascii.length);
        auto data = uBit.storage.get(buf);
        return mkBuffer(data->value, 32); 
    }
}