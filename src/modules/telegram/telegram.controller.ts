import TelegramService from "./telegram.service.ts"
import { Request, Response } from "express";


class TelegramController {
    private readonly telegramService: TelegramService;

    constructor(telegramService: TelegramService) {
        this.telegramService = telegramService;
    }

    startQrAuth = async (req: Request, res: Response) => {
        res.set({
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
        });

        res.flushHeaders();

        const abort = new AbortController();

        req.on("close", () => {
            abort.abort();
        });

        const send = (event: string, data: unknown) => {
            res.write(
                `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`,
            );
        };

        try {
            const user = await this.telegramService.startQrAuth(
                (url, expires) => {
                    send("qr", { url, expires });
                },
                abort.signal,
            );

            send("done", { id: user.id, user: user.className });
        } catch (error) {
            send("error", {
                message: (error as Error).message,
            });
        } finally {
            res.end();
        }

    }
}

export default TelegramController;