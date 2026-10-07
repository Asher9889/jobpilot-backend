import { EventEmitter } from 'node:events';

/**
 * We will use Composition over Inheritance here. Instead of extending EventEmitter directly.
 * 1. Inheritence MEans A is a type of B. by extending EventEmitter.
 * 2. Composition means A has a B. It means we will create an instance inside the class and use it. This is more flexible and allows us to change the implementation of EventEmitter in the future if needed.
 */

class EventBus {
    private readonly eventBus: EventEmitter;

    constructor() {
        this.eventBus = new EventEmitter();
    } 


    emit = <TPayload>(event: string, payload: TPayload) => {
        this.eventBus.emit(event, payload);
    }

    on = <TPayload>(event: string, handler: (payload: TPayload) => void) => {
        this.eventBus.on(event, handler);
    }

    off = <TPayload>(event: string, handler: (payload: TPayload) => void) => {
        this.eventBus.off(event, handler);
    }

}

export default EventBus;