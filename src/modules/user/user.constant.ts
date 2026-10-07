const USER_ROLE = {
    SUPER_ADMIN: "SUPER_ADMIN",
    ADMIN: "ADMIN",
    USER: "USER"
} as const;

const ACCOUNT_STATUS = {
    ACTIVE: "ACTIVE",
    INACTIVE: "INACTIVE",
} as const;

const USER_EVENTS = {
    USER: {
        CREATED: "USER_CREATED",
        UPDATED: "USER_UPDATED",
    }
} as const

export { USER_ROLE, ACCOUNT_STATUS, USER_EVENTS };