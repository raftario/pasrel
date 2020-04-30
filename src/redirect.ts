import { Reply } from ".";

export function temporary(url: string, status: 302 | 303 | 307 = 302): [Reply] {
    return [
        {
            _: "reply",
            status,
            headers: { Location: url },
        },
    ];
}

export function permanent(url: string, status: 301 | 308 = 301): [Reply] {
    return [
        {
            _: "reply",
            status,
            headers: { Location: url },
        },
    ];
}
