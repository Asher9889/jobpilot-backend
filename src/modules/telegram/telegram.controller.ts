import { StatusCodes } from "http-status-codes";
import TelegramService from "./telegram.service.ts";
import { NextFunction, Request, Response } from "express";
import { ApiResponse } from "../../utils/index.ts";


class TelegramController {
    private readonly telegramService: TelegramService;

    constructor(telegramService: TelegramService) {
        this.telegramService = telegramService;
    }

    startQrAuth = async (req: Request, res: Response) => {
        const loggedInUser = req.validatedUser;
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
            const profile = await this.telegramService.startQrAuth(
                (url, expires) => {
                    send("qr", { url, expires });
                },
                abort.signal,
                loggedInUser
            );

            // if (!profile) {
            //     throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, "Failed to retrieve Telegram profile after QR authentication");
            // }
            // const profile = await this.telegramService.getProfileSummary(user);

            send("done", { id: profile!.id, user: profile });
        } catch (error) {
            send("error", {
                message: (error as Error).message,
            });
        } finally {
            res.end();
        }

    }

    /**
     * To get all available groups and channels name amd its meta data
     */
    getAvailableSources = async (req: Request, res: Response, next: NextFunction) => {
        const loggedInUser = req.validatedUser;
        try {
            const sources = await this.telegramService.getAvailableSources(loggedInUser);
            return ApiResponse.success(res, StatusCodes.OK, "Available sources fetched successfully", sources);
        } catch (error) {
            next(error);
        }
    }

 

}

export default TelegramController;