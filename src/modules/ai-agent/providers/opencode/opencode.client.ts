import { createOpencode } from "@opencode-ai/sdk";

const opencode = await createOpencode({ // create client and server both
    hostname: "127.0.0.1",
    port: 9040,
})

console.log(`Server running at ${opencode.server.url}`)

export default opencode;