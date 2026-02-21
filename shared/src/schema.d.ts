/**
 * Copyright © 2026 Mike Hall
 * Licensed under the GNU General Public License v3.0.
 */

import { z } from 'zod';
export declare const SCHEMA_VERSION = "0.2.0";
export declare const SuitSchema: z.ZodEnum<["spades", "hearts", "diamonds", "clubs"]>;
export declare const RankSchema: z.ZodEnum<["A", "2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K"]>;
export declare const CardSchema: z.ZodObject<{
    suit: z.ZodEnum<["spades", "hearts", "diamonds", "clubs"]>;
    rank: z.ZodEnum<["A", "2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K"]>;
}, "strip", z.ZodTypeAny, {
    suit: "spades" | "hearts" | "diamonds" | "clubs";
    rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
}, {
    suit: "spades" | "hearts" | "diamonds" | "clubs";
    rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
}>;
export declare const PlayerSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
}, {
    id: string;
    name: string;
}>;
export declare const MatchConfigSchema: z.ZodObject<{
    matchId: z.ZodString;
    players: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        name: string;
    }, {
        id: string;
        name: string;
    }>, "many">;
    createdAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    matchId: string;
    players: {
        id: string;
        name: string;
    }[];
    createdAt: string;
}, {
    matchId: string;
    players: {
        id: string;
        name: string;
    }[];
    createdAt: string;
}>;
export declare const WsMessageEnvelopeSchema: z.ZodObject<{
    type: z.ZodString;
    payload: z.ZodUnknown;
    timestamp: z.ZodString;
    matchId: z.ZodOptional<z.ZodString>;
    playerId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: string;
    timestamp: string;
    matchId?: string | undefined;
    payload?: unknown;
    playerId?: string | undefined;
}, {
    type: string;
    timestamp: string;
    matchId?: string | undefined;
    payload?: unknown;
    playerId?: string | undefined;
}>;
export declare const ErrorResponseSchema: z.ZodObject<{
    error: z.ZodString;
    code: z.ZodString;
    details: z.ZodOptional<z.ZodUnknown>;
}, "strip", z.ZodTypeAny, {
    code: string;
    error: string;
    details?: unknown;
}, {
    code: string;
    error: string;
    details?: unknown;
}>;
export declare const HealthResponseSchema: z.ZodObject<{
    status: z.ZodEnum<["ok", "degraded", "error"]>;
    timestamp: z.ZodString;
    version: z.ZodString;
}, "strip", z.ZodTypeAny, {
    status: "error" | "ok" | "degraded";
    timestamp: string;
    version: string;
}, {
    status: "error" | "ok" | "degraded";
    timestamp: string;
    version: string;
}>;
/** Numeric value lookup: A=1, 2-9=face, T=10, J/Q/K=11 */
export declare const RANK_VALUES: Record<string, number>;
export declare const DeckSchema: z.ZodArray<z.ZodObject<{
    suit: z.ZodEnum<["spades", "hearts", "diamonds", "clubs"]>;
    rank: z.ZodEnum<["A", "2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K"]>;
}, "strip", z.ZodTypeAny, {
    suit: "spades" | "hearts" | "diamonds" | "clubs";
    rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
}, {
    suit: "spades" | "hearts" | "diamonds" | "clubs";
    rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
}>, "many">;
export declare const GridPositionSchema: z.ZodObject<{
    row: z.ZodNumber;
    col: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    row: number;
    col: number;
}, {
    row: number;
    col: number;
}>;
export declare const BattlefieldCardSchema: z.ZodObject<{
    card: z.ZodObject<{
        suit: z.ZodEnum<["spades", "hearts", "diamonds", "clubs"]>;
        rank: z.ZodEnum<["A", "2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K"]>;
    }, "strip", z.ZodTypeAny, {
        suit: "spades" | "hearts" | "diamonds" | "clubs";
        rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
    }, {
        suit: "spades" | "hearts" | "diamonds" | "clubs";
        rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
    }>;
    position: z.ZodObject<{
        row: z.ZodNumber;
        col: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        row: number;
        col: number;
    }, {
        row: number;
        col: number;
    }>;
    currentHp: z.ZodNumber;
    faceDown: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    card: {
        suit: "spades" | "hearts" | "diamonds" | "clubs";
        rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
    };
    position: {
        row: number;
        col: number;
    };
    currentHp: number;
    faceDown: boolean;
}, {
    card: {
        suit: "spades" | "hearts" | "diamonds" | "clubs";
        rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
    };
    position: {
        row: number;
        col: number;
    };
    currentHp: number;
    faceDown: boolean;
}>;
/** 2×4 grid — 8 slots, each either a BattlefieldCard or null (empty) */
export declare const BattlefieldSchema: z.ZodArray<z.ZodUnion<[z.ZodObject<{
    card: z.ZodObject<{
        suit: z.ZodEnum<["spades", "hearts", "diamonds", "clubs"]>;
        rank: z.ZodEnum<["A", "2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K"]>;
    }, "strip", z.ZodTypeAny, {
        suit: "spades" | "hearts" | "diamonds" | "clubs";
        rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
    }, {
        suit: "spades" | "hearts" | "diamonds" | "clubs";
        rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
    }>;
    position: z.ZodObject<{
        row: z.ZodNumber;
        col: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        row: number;
        col: number;
    }, {
        row: number;
        col: number;
    }>;
    currentHp: z.ZodNumber;
    faceDown: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    card: {
        suit: "spades" | "hearts" | "diamonds" | "clubs";
        rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
    };
    position: {
        row: number;
        col: number;
    };
    currentHp: number;
    faceDown: boolean;
}, {
    card: {
        suit: "spades" | "hearts" | "diamonds" | "clubs";
        rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
    };
    position: {
        row: number;
        col: number;
    };
    currentHp: number;
    faceDown: boolean;
}>, z.ZodNull]>, "many">;
export declare const PlayerStateSchema: z.ZodObject<{
    player: z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        name: string;
    }, {
        id: string;
        name: string;
    }>;
    hand: z.ZodArray<z.ZodObject<{
        suit: z.ZodEnum<["spades", "hearts", "diamonds", "clubs"]>;
        rank: z.ZodEnum<["A", "2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K"]>;
    }, "strip", z.ZodTypeAny, {
        suit: "spades" | "hearts" | "diamonds" | "clubs";
        rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
    }, {
        suit: "spades" | "hearts" | "diamonds" | "clubs";
        rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
    }>, "many">;
    battlefield: z.ZodArray<z.ZodUnion<[z.ZodObject<{
        card: z.ZodObject<{
            suit: z.ZodEnum<["spades", "hearts", "diamonds", "clubs"]>;
            rank: z.ZodEnum<["A", "2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K"]>;
        }, "strip", z.ZodTypeAny, {
            suit: "spades" | "hearts" | "diamonds" | "clubs";
            rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
        }, {
            suit: "spades" | "hearts" | "diamonds" | "clubs";
            rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
        }>;
        position: z.ZodObject<{
            row: z.ZodNumber;
            col: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            row: number;
            col: number;
        }, {
            row: number;
            col: number;
        }>;
        currentHp: z.ZodNumber;
        faceDown: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        card: {
            suit: "spades" | "hearts" | "diamonds" | "clubs";
            rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
        };
        position: {
            row: number;
            col: number;
        };
        currentHp: number;
        faceDown: boolean;
    }, {
        card: {
            suit: "spades" | "hearts" | "diamonds" | "clubs";
            rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
        };
        position: {
            row: number;
            col: number;
        };
        currentHp: number;
        faceDown: boolean;
    }>, z.ZodNull]>, "many">;
    drawpile: z.ZodArray<z.ZodObject<{
        suit: z.ZodEnum<["spades", "hearts", "diamonds", "clubs"]>;
        rank: z.ZodEnum<["A", "2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K"]>;
    }, "strip", z.ZodTypeAny, {
        suit: "spades" | "hearts" | "diamonds" | "clubs";
        rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
    }, {
        suit: "spades" | "hearts" | "diamonds" | "clubs";
        rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
    }>, "many">;
    discardPile: z.ZodArray<z.ZodObject<{
        suit: z.ZodEnum<["spades", "hearts", "diamonds", "clubs"]>;
        rank: z.ZodEnum<["A", "2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K"]>;
    }, "strip", z.ZodTypeAny, {
        suit: "spades" | "hearts" | "diamonds" | "clubs";
        rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
    }, {
        suit: "spades" | "hearts" | "diamonds" | "clubs";
        rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
    }>, "many">;
    lifepoints: z.ZodNumber;
    handCount: z.ZodOptional<z.ZodNumber>;
    drawpileCount: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    player: {
        id: string;
        name: string;
    };
    hand: {
        suit: "spades" | "hearts" | "diamonds" | "clubs";
        rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
    }[];
    battlefield: ({
        card: {
            suit: "spades" | "hearts" | "diamonds" | "clubs";
            rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
        };
        position: {
            row: number;
            col: number;
        };
        currentHp: number;
        faceDown: boolean;
    } | null)[];
    drawpile: {
        suit: "spades" | "hearts" | "diamonds" | "clubs";
        rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
    }[];
    discardPile: {
        suit: "spades" | "hearts" | "diamonds" | "clubs";
        rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
    }[];
    lifepoints: number;
    handCount?: number | undefined;
    drawpileCount?: number | undefined;
}, {
    player: {
        id: string;
        name: string;
    };
    hand: {
        suit: "spades" | "hearts" | "diamonds" | "clubs";
        rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
    }[];
    battlefield: ({
        card: {
            suit: "spades" | "hearts" | "diamonds" | "clubs";
            rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
        };
        position: {
            row: number;
            col: number;
        };
        currentHp: number;
        faceDown: boolean;
    } | null)[];
    drawpile: {
        suit: "spades" | "hearts" | "diamonds" | "clubs";
        rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
    }[];
    discardPile: {
        suit: "spades" | "hearts" | "diamonds" | "clubs";
        rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
    }[];
    lifepoints: number;
    handCount?: number | undefined;
    drawpileCount?: number | undefined;
}>;
export declare const GamePhaseSchema: z.ZodEnum<["setup", "deployment", "combat", "reinforcement", "gameOver"]>;
export declare const CombatBonusTypeSchema: z.ZodEnum<["aceInvulnerable", "aceVsAce", "diamondDeathShield", "clubDoubleOverflow", "spadeDoubleLp", "heartDeathShield"]>;
export declare const CombatLogStepSchema: z.ZodObject<{
    target: z.ZodEnum<["frontCard", "backCard", "playerLp"]>;
    card: z.ZodOptional<z.ZodObject<{
        suit: z.ZodEnum<["spades", "hearts", "diamonds", "clubs"]>;
        rank: z.ZodEnum<["A", "2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K"]>;
    }, "strip", z.ZodTypeAny, {
        suit: "spades" | "hearts" | "diamonds" | "clubs";
        rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
    }, {
        suit: "spades" | "hearts" | "diamonds" | "clubs";
        rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
    }>>;
    incomingDamage: z.ZodNumber;
    hpBefore: z.ZodOptional<z.ZodNumber>;
    effectiveHp: z.ZodOptional<z.ZodNumber>;
    absorbed: z.ZodOptional<z.ZodNumber>;
    overflow: z.ZodOptional<z.ZodNumber>;
    damage: z.ZodNumber;
    hpAfter: z.ZodOptional<z.ZodNumber>;
    destroyed: z.ZodOptional<z.ZodBoolean>;
    lpBefore: z.ZodOptional<z.ZodNumber>;
    lpAfter: z.ZodOptional<z.ZodNumber>;
    bonuses: z.ZodOptional<z.ZodArray<z.ZodEnum<["aceInvulnerable", "aceVsAce", "diamondDeathShield", "clubDoubleOverflow", "spadeDoubleLp", "heartDeathShield"]>, "many">>;
}, "strip", z.ZodTypeAny, {
    target: "frontCard" | "backCard" | "playerLp";
    incomingDamage: number;
    damage: number;
    card?: {
        suit: "spades" | "hearts" | "diamonds" | "clubs";
        rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
    } | undefined;
    hpBefore?: number | undefined;
    effectiveHp?: number | undefined;
    absorbed?: number | undefined;
    overflow?: number | undefined;
    hpAfter?: number | undefined;
    destroyed?: boolean | undefined;
    lpBefore?: number | undefined;
    lpAfter?: number | undefined;
    bonuses?: ("aceInvulnerable" | "aceVsAce" | "diamondDeathShield" | "clubDoubleOverflow" | "spadeDoubleLp" | "heartDeathShield")[] | undefined;
}, {
    target: "frontCard" | "backCard" | "playerLp";
    incomingDamage: number;
    damage: number;
    card?: {
        suit: "spades" | "hearts" | "diamonds" | "clubs";
        rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
    } | undefined;
    hpBefore?: number | undefined;
    effectiveHp?: number | undefined;
    absorbed?: number | undefined;
    overflow?: number | undefined;
    hpAfter?: number | undefined;
    destroyed?: boolean | undefined;
    lpBefore?: number | undefined;
    lpAfter?: number | undefined;
    bonuses?: ("aceInvulnerable" | "aceVsAce" | "diamondDeathShield" | "clubDoubleOverflow" | "spadeDoubleLp" | "heartDeathShield")[] | undefined;
}>;
export declare const CombatLogEntrySchema: z.ZodObject<{
    turnNumber: z.ZodNumber;
    attackerPlayerIndex: z.ZodNumber;
    attackerCard: z.ZodObject<{
        suit: z.ZodEnum<["spades", "hearts", "diamonds", "clubs"]>;
        rank: z.ZodEnum<["A", "2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K"]>;
    }, "strip", z.ZodTypeAny, {
        suit: "spades" | "hearts" | "diamonds" | "clubs";
        rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
    }, {
        suit: "spades" | "hearts" | "diamonds" | "clubs";
        rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
    }>;
    targetColumn: z.ZodNumber;
    baseDamage: z.ZodNumber;
    steps: z.ZodArray<z.ZodObject<{
        target: z.ZodEnum<["frontCard", "backCard", "playerLp"]>;
        card: z.ZodOptional<z.ZodObject<{
            suit: z.ZodEnum<["spades", "hearts", "diamonds", "clubs"]>;
            rank: z.ZodEnum<["A", "2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K"]>;
        }, "strip", z.ZodTypeAny, {
            suit: "spades" | "hearts" | "diamonds" | "clubs";
            rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
        }, {
            suit: "spades" | "hearts" | "diamonds" | "clubs";
            rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
        }>>;
        incomingDamage: z.ZodNumber;
        hpBefore: z.ZodOptional<z.ZodNumber>;
        effectiveHp: z.ZodOptional<z.ZodNumber>;
        absorbed: z.ZodOptional<z.ZodNumber>;
        overflow: z.ZodOptional<z.ZodNumber>;
        damage: z.ZodNumber;
        hpAfter: z.ZodOptional<z.ZodNumber>;
        destroyed: z.ZodOptional<z.ZodBoolean>;
        lpBefore: z.ZodOptional<z.ZodNumber>;
        lpAfter: z.ZodOptional<z.ZodNumber>;
        bonuses: z.ZodOptional<z.ZodArray<z.ZodEnum<["aceInvulnerable", "aceVsAce", "diamondDeathShield", "clubDoubleOverflow", "spadeDoubleLp", "heartDeathShield"]>, "many">>;
    }, "strip", z.ZodTypeAny, {
        target: "frontCard" | "backCard" | "playerLp";
        incomingDamage: number;
        damage: number;
        card?: {
            suit: "spades" | "hearts" | "diamonds" | "clubs";
            rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
        } | undefined;
        hpBefore?: number | undefined;
        effectiveHp?: number | undefined;
        absorbed?: number | undefined;
        overflow?: number | undefined;
        hpAfter?: number | undefined;
        destroyed?: boolean | undefined;
        lpBefore?: number | undefined;
        lpAfter?: number | undefined;
        bonuses?: ("aceInvulnerable" | "aceVsAce" | "diamondDeathShield" | "clubDoubleOverflow" | "spadeDoubleLp" | "heartDeathShield")[] | undefined;
    }, {
        target: "frontCard" | "backCard" | "playerLp";
        incomingDamage: number;
        damage: number;
        card?: {
            suit: "spades" | "hearts" | "diamonds" | "clubs";
            rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
        } | undefined;
        hpBefore?: number | undefined;
        effectiveHp?: number | undefined;
        absorbed?: number | undefined;
        overflow?: number | undefined;
        hpAfter?: number | undefined;
        destroyed?: boolean | undefined;
        lpBefore?: number | undefined;
        lpAfter?: number | undefined;
        bonuses?: ("aceInvulnerable" | "aceVsAce" | "diamondDeathShield" | "clubDoubleOverflow" | "spadeDoubleLp" | "heartDeathShield")[] | undefined;
    }>, "many">;
    totalLpDamage: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    turnNumber: number;
    attackerPlayerIndex: number;
    attackerCard: {
        suit: "spades" | "hearts" | "diamonds" | "clubs";
        rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
    };
    targetColumn: number;
    baseDamage: number;
    steps: {
        target: "frontCard" | "backCard" | "playerLp";
        incomingDamage: number;
        damage: number;
        card?: {
            suit: "spades" | "hearts" | "diamonds" | "clubs";
            rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
        } | undefined;
        hpBefore?: number | undefined;
        effectiveHp?: number | undefined;
        absorbed?: number | undefined;
        overflow?: number | undefined;
        hpAfter?: number | undefined;
        destroyed?: boolean | undefined;
        lpBefore?: number | undefined;
        lpAfter?: number | undefined;
        bonuses?: ("aceInvulnerable" | "aceVsAce" | "diamondDeathShield" | "clubDoubleOverflow" | "spadeDoubleLp" | "heartDeathShield")[] | undefined;
    }[];
    totalLpDamage: number;
}, {
    turnNumber: number;
    attackerPlayerIndex: number;
    attackerCard: {
        suit: "spades" | "hearts" | "diamonds" | "clubs";
        rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
    };
    targetColumn: number;
    baseDamage: number;
    steps: {
        target: "frontCard" | "backCard" | "playerLp";
        incomingDamage: number;
        damage: number;
        card?: {
            suit: "spades" | "hearts" | "diamonds" | "clubs";
            rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
        } | undefined;
        hpBefore?: number | undefined;
        effectiveHp?: number | undefined;
        absorbed?: number | undefined;
        overflow?: number | undefined;
        hpAfter?: number | undefined;
        destroyed?: boolean | undefined;
        lpBefore?: number | undefined;
        lpAfter?: number | undefined;
        bonuses?: ("aceInvulnerable" | "aceVsAce" | "diamondDeathShield" | "clubDoubleOverflow" | "spadeDoubleLp" | "heartDeathShield")[] | undefined;
    }[];
    totalLpDamage: number;
}>;
export declare const ReinforcementContextSchema: z.ZodObject<{
    column: z.ZodNumber;
    attackerIndex: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    column: number;
    attackerIndex: number;
}, {
    column: number;
    attackerIndex: number;
}>;
export declare const DamageModeSchema: z.ZodEnum<["cumulative", "per-turn"]>;
export declare const GameOptionsSchema: z.ZodDefault<z.ZodObject<{
    damageMode: z.ZodDefault<z.ZodEnum<["cumulative", "per-turn"]>>;
}, "strip", z.ZodTypeAny, {
    damageMode: "cumulative" | "per-turn";
}, {
    damageMode?: "cumulative" | "per-turn" | undefined;
}>>;
export declare const VictoryTypeSchema: z.ZodEnum<["lpDepletion", "cardDepletion", "forfeit"]>;
export declare const GameOutcomeSchema: z.ZodObject<{
    winnerIndex: z.ZodNumber;
    victoryType: z.ZodEnum<["lpDepletion", "cardDepletion", "forfeit"]>;
    turnNumber: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    turnNumber: number;
    winnerIndex: number;
    victoryType: "lpDepletion" | "cardDepletion" | "forfeit";
}, {
    turnNumber: number;
    winnerIndex: number;
    victoryType: "lpDepletion" | "cardDepletion" | "forfeit";
}>;
export declare const DeployActionSchema: z.ZodObject<{
    type: z.ZodLiteral<"deploy">;
    playerIndex: z.ZodNumber;
    card: z.ZodObject<{
        suit: z.ZodEnum<["spades", "hearts", "diamonds", "clubs"]>;
        rank: z.ZodEnum<["A", "2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K"]>;
    }, "strip", z.ZodTypeAny, {
        suit: "spades" | "hearts" | "diamonds" | "clubs";
        rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
    }, {
        suit: "spades" | "hearts" | "diamonds" | "clubs";
        rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
    }>;
    column: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    type: "deploy";
    card: {
        suit: "spades" | "hearts" | "diamonds" | "clubs";
        rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
    };
    column: number;
    playerIndex: number;
}, {
    type: "deploy";
    card: {
        suit: "spades" | "hearts" | "diamonds" | "clubs";
        rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
    };
    column: number;
    playerIndex: number;
}>;
export declare const AttackActionSchema: z.ZodObject<{
    type: z.ZodLiteral<"attack">;
    playerIndex: z.ZodNumber;
    attackerPosition: z.ZodObject<{
        row: z.ZodNumber;
        col: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        row: number;
        col: number;
    }, {
        row: number;
        col: number;
    }>;
    targetPosition: z.ZodObject<{
        row: z.ZodNumber;
        col: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        row: number;
        col: number;
    }, {
        row: number;
        col: number;
    }>;
}, "strip", z.ZodTypeAny, {
    type: "attack";
    playerIndex: number;
    attackerPosition: {
        row: number;
        col: number;
    };
    targetPosition: {
        row: number;
        col: number;
    };
}, {
    type: "attack";
    playerIndex: number;
    attackerPosition: {
        row: number;
        col: number;
    };
    targetPosition: {
        row: number;
        col: number;
    };
}>;
export declare const PassActionSchema: z.ZodObject<{
    type: z.ZodLiteral<"pass">;
    playerIndex: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    type: "pass";
    playerIndex: number;
}, {
    type: "pass";
    playerIndex: number;
}>;
export declare const ReinforceActionSchema: z.ZodObject<{
    type: z.ZodLiteral<"reinforce">;
    playerIndex: z.ZodNumber;
    card: z.ZodObject<{
        suit: z.ZodEnum<["spades", "hearts", "diamonds", "clubs"]>;
        rank: z.ZodEnum<["A", "2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K"]>;
    }, "strip", z.ZodTypeAny, {
        suit: "spades" | "hearts" | "diamonds" | "clubs";
        rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
    }, {
        suit: "spades" | "hearts" | "diamonds" | "clubs";
        rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
    }>;
}, "strip", z.ZodTypeAny, {
    type: "reinforce";
    card: {
        suit: "spades" | "hearts" | "diamonds" | "clubs";
        rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
    };
    playerIndex: number;
}, {
    type: "reinforce";
    card: {
        suit: "spades" | "hearts" | "diamonds" | "clubs";
        rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
    };
    playerIndex: number;
}>;
export declare const ForfeitActionSchema: z.ZodObject<{
    type: z.ZodLiteral<"forfeit">;
    playerIndex: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    type: "forfeit";
    playerIndex: number;
}, {
    type: "forfeit";
    playerIndex: number;
}>;
export declare const ActionSchema: z.ZodDiscriminatedUnion<"type", [z.ZodObject<{
    type: z.ZodLiteral<"deploy">;
    playerIndex: z.ZodNumber;
    card: z.ZodObject<{
        suit: z.ZodEnum<["spades", "hearts", "diamonds", "clubs"]>;
        rank: z.ZodEnum<["A", "2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K"]>;
    }, "strip", z.ZodTypeAny, {
        suit: "spades" | "hearts" | "diamonds" | "clubs";
        rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
    }, {
        suit: "spades" | "hearts" | "diamonds" | "clubs";
        rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
    }>;
    column: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    type: "deploy";
    card: {
        suit: "spades" | "hearts" | "diamonds" | "clubs";
        rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
    };
    column: number;
    playerIndex: number;
}, {
    type: "deploy";
    card: {
        suit: "spades" | "hearts" | "diamonds" | "clubs";
        rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
    };
    column: number;
    playerIndex: number;
}>, z.ZodObject<{
    type: z.ZodLiteral<"attack">;
    playerIndex: z.ZodNumber;
    attackerPosition: z.ZodObject<{
        row: z.ZodNumber;
        col: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        row: number;
        col: number;
    }, {
        row: number;
        col: number;
    }>;
    targetPosition: z.ZodObject<{
        row: z.ZodNumber;
        col: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        row: number;
        col: number;
    }, {
        row: number;
        col: number;
    }>;
}, "strip", z.ZodTypeAny, {
    type: "attack";
    playerIndex: number;
    attackerPosition: {
        row: number;
        col: number;
    };
    targetPosition: {
        row: number;
        col: number;
    };
}, {
    type: "attack";
    playerIndex: number;
    attackerPosition: {
        row: number;
        col: number;
    };
    targetPosition: {
        row: number;
        col: number;
    };
}>, z.ZodObject<{
    type: z.ZodLiteral<"pass">;
    playerIndex: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    type: "pass";
    playerIndex: number;
}, {
    type: "pass";
    playerIndex: number;
}>, z.ZodObject<{
    type: z.ZodLiteral<"reinforce">;
    playerIndex: z.ZodNumber;
    card: z.ZodObject<{
        suit: z.ZodEnum<["spades", "hearts", "diamonds", "clubs"]>;
        rank: z.ZodEnum<["A", "2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K"]>;
    }, "strip", z.ZodTypeAny, {
        suit: "spades" | "hearts" | "diamonds" | "clubs";
        rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
    }, {
        suit: "spades" | "hearts" | "diamonds" | "clubs";
        rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
    }>;
}, "strip", z.ZodTypeAny, {
    type: "reinforce";
    card: {
        suit: "spades" | "hearts" | "diamonds" | "clubs";
        rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
    };
    playerIndex: number;
}, {
    type: "reinforce";
    card: {
        suit: "spades" | "hearts" | "diamonds" | "clubs";
        rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
    };
    playerIndex: number;
}>, z.ZodObject<{
    type: z.ZodLiteral<"forfeit">;
    playerIndex: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    type: "forfeit";
    playerIndex: number;
}, {
    type: "forfeit";
    playerIndex: number;
}>]>;
export declare const TransactionDetailDeploySchema: z.ZodObject<{
    type: z.ZodLiteral<"deploy">;
    gridIndex: z.ZodNumber;
    phaseAfter: z.ZodEnum<["setup", "deployment", "combat", "reinforcement", "gameOver"]>;
}, "strip", z.ZodTypeAny, {
    type: "deploy";
    gridIndex: number;
    phaseAfter: "setup" | "deployment" | "combat" | "reinforcement" | "gameOver";
}, {
    type: "deploy";
    gridIndex: number;
    phaseAfter: "setup" | "deployment" | "combat" | "reinforcement" | "gameOver";
}>;
export declare const TransactionDetailAttackSchema: z.ZodObject<{
    type: z.ZodLiteral<"attack">;
    combat: z.ZodObject<{
        turnNumber: z.ZodNumber;
        attackerPlayerIndex: z.ZodNumber;
        attackerCard: z.ZodObject<{
            suit: z.ZodEnum<["spades", "hearts", "diamonds", "clubs"]>;
            rank: z.ZodEnum<["A", "2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K"]>;
        }, "strip", z.ZodTypeAny, {
            suit: "spades" | "hearts" | "diamonds" | "clubs";
            rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
        }, {
            suit: "spades" | "hearts" | "diamonds" | "clubs";
            rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
        }>;
        targetColumn: z.ZodNumber;
        baseDamage: z.ZodNumber;
        steps: z.ZodArray<z.ZodObject<{
            target: z.ZodEnum<["frontCard", "backCard", "playerLp"]>;
            card: z.ZodOptional<z.ZodObject<{
                suit: z.ZodEnum<["spades", "hearts", "diamonds", "clubs"]>;
                rank: z.ZodEnum<["A", "2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K"]>;
            }, "strip", z.ZodTypeAny, {
                suit: "spades" | "hearts" | "diamonds" | "clubs";
                rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
            }, {
                suit: "spades" | "hearts" | "diamonds" | "clubs";
                rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
            }>>;
            incomingDamage: z.ZodNumber;
            hpBefore: z.ZodOptional<z.ZodNumber>;
            effectiveHp: z.ZodOptional<z.ZodNumber>;
            absorbed: z.ZodOptional<z.ZodNumber>;
            overflow: z.ZodOptional<z.ZodNumber>;
            damage: z.ZodNumber;
            hpAfter: z.ZodOptional<z.ZodNumber>;
            destroyed: z.ZodOptional<z.ZodBoolean>;
            lpBefore: z.ZodOptional<z.ZodNumber>;
            lpAfter: z.ZodOptional<z.ZodNumber>;
            bonuses: z.ZodOptional<z.ZodArray<z.ZodEnum<["aceInvulnerable", "aceVsAce", "diamondDeathShield", "clubDoubleOverflow", "spadeDoubleLp", "heartDeathShield"]>, "many">>;
        }, "strip", z.ZodTypeAny, {
            target: "frontCard" | "backCard" | "playerLp";
            incomingDamage: number;
            damage: number;
            card?: {
                suit: "spades" | "hearts" | "diamonds" | "clubs";
                rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
            } | undefined;
            hpBefore?: number | undefined;
            effectiveHp?: number | undefined;
            absorbed?: number | undefined;
            overflow?: number | undefined;
            hpAfter?: number | undefined;
            destroyed?: boolean | undefined;
            lpBefore?: number | undefined;
            lpAfter?: number | undefined;
            bonuses?: ("aceInvulnerable" | "aceVsAce" | "diamondDeathShield" | "clubDoubleOverflow" | "spadeDoubleLp" | "heartDeathShield")[] | undefined;
        }, {
            target: "frontCard" | "backCard" | "playerLp";
            incomingDamage: number;
            damage: number;
            card?: {
                suit: "spades" | "hearts" | "diamonds" | "clubs";
                rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
            } | undefined;
            hpBefore?: number | undefined;
            effectiveHp?: number | undefined;
            absorbed?: number | undefined;
            overflow?: number | undefined;
            hpAfter?: number | undefined;
            destroyed?: boolean | undefined;
            lpBefore?: number | undefined;
            lpAfter?: number | undefined;
            bonuses?: ("aceInvulnerable" | "aceVsAce" | "diamondDeathShield" | "clubDoubleOverflow" | "spadeDoubleLp" | "heartDeathShield")[] | undefined;
        }>, "many">;
        totalLpDamage: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        turnNumber: number;
        attackerPlayerIndex: number;
        attackerCard: {
            suit: "spades" | "hearts" | "diamonds" | "clubs";
            rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
        };
        targetColumn: number;
        baseDamage: number;
        steps: {
            target: "frontCard" | "backCard" | "playerLp";
            incomingDamage: number;
            damage: number;
            card?: {
                suit: "spades" | "hearts" | "diamonds" | "clubs";
                rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
            } | undefined;
            hpBefore?: number | undefined;
            effectiveHp?: number | undefined;
            absorbed?: number | undefined;
            overflow?: number | undefined;
            hpAfter?: number | undefined;
            destroyed?: boolean | undefined;
            lpBefore?: number | undefined;
            lpAfter?: number | undefined;
            bonuses?: ("aceInvulnerable" | "aceVsAce" | "diamondDeathShield" | "clubDoubleOverflow" | "spadeDoubleLp" | "heartDeathShield")[] | undefined;
        }[];
        totalLpDamage: number;
    }, {
        turnNumber: number;
        attackerPlayerIndex: number;
        attackerCard: {
            suit: "spades" | "hearts" | "diamonds" | "clubs";
            rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
        };
        targetColumn: number;
        baseDamage: number;
        steps: {
            target: "frontCard" | "backCard" | "playerLp";
            incomingDamage: number;
            damage: number;
            card?: {
                suit: "spades" | "hearts" | "diamonds" | "clubs";
                rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
            } | undefined;
            hpBefore?: number | undefined;
            effectiveHp?: number | undefined;
            absorbed?: number | undefined;
            overflow?: number | undefined;
            hpAfter?: number | undefined;
            destroyed?: boolean | undefined;
            lpBefore?: number | undefined;
            lpAfter?: number | undefined;
            bonuses?: ("aceInvulnerable" | "aceVsAce" | "diamondDeathShield" | "clubDoubleOverflow" | "spadeDoubleLp" | "heartDeathShield")[] | undefined;
        }[];
        totalLpDamage: number;
    }>;
    reinforcementTriggered: z.ZodBoolean;
    victoryTriggered: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    type: "attack";
    combat: {
        turnNumber: number;
        attackerPlayerIndex: number;
        attackerCard: {
            suit: "spades" | "hearts" | "diamonds" | "clubs";
            rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
        };
        targetColumn: number;
        baseDamage: number;
        steps: {
            target: "frontCard" | "backCard" | "playerLp";
            incomingDamage: number;
            damage: number;
            card?: {
                suit: "spades" | "hearts" | "diamonds" | "clubs";
                rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
            } | undefined;
            hpBefore?: number | undefined;
            effectiveHp?: number | undefined;
            absorbed?: number | undefined;
            overflow?: number | undefined;
            hpAfter?: number | undefined;
            destroyed?: boolean | undefined;
            lpBefore?: number | undefined;
            lpAfter?: number | undefined;
            bonuses?: ("aceInvulnerable" | "aceVsAce" | "diamondDeathShield" | "clubDoubleOverflow" | "spadeDoubleLp" | "heartDeathShield")[] | undefined;
        }[];
        totalLpDamage: number;
    };
    reinforcementTriggered: boolean;
    victoryTriggered: boolean;
}, {
    type: "attack";
    combat: {
        turnNumber: number;
        attackerPlayerIndex: number;
        attackerCard: {
            suit: "spades" | "hearts" | "diamonds" | "clubs";
            rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
        };
        targetColumn: number;
        baseDamage: number;
        steps: {
            target: "frontCard" | "backCard" | "playerLp";
            incomingDamage: number;
            damage: number;
            card?: {
                suit: "spades" | "hearts" | "diamonds" | "clubs";
                rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
            } | undefined;
            hpBefore?: number | undefined;
            effectiveHp?: number | undefined;
            absorbed?: number | undefined;
            overflow?: number | undefined;
            hpAfter?: number | undefined;
            destroyed?: boolean | undefined;
            lpBefore?: number | undefined;
            lpAfter?: number | undefined;
            bonuses?: ("aceInvulnerable" | "aceVsAce" | "diamondDeathShield" | "clubDoubleOverflow" | "spadeDoubleLp" | "heartDeathShield")[] | undefined;
        }[];
        totalLpDamage: number;
    };
    reinforcementTriggered: boolean;
    victoryTriggered: boolean;
}>;
export declare const TransactionDetailPassSchema: z.ZodObject<{
    type: z.ZodLiteral<"pass">;
}, "strip", z.ZodTypeAny, {
    type: "pass";
}, {
    type: "pass";
}>;
export declare const TransactionDetailReinforceSchema: z.ZodObject<{
    type: z.ZodLiteral<"reinforce">;
    column: z.ZodNumber;
    gridIndex: z.ZodNumber;
    cardsDrawn: z.ZodNumber;
    reinforcementComplete: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    type: "reinforce";
    column: number;
    gridIndex: number;
    cardsDrawn: number;
    reinforcementComplete: boolean;
}, {
    type: "reinforce";
    column: number;
    gridIndex: number;
    cardsDrawn: number;
    reinforcementComplete: boolean;
}>;
export declare const TransactionDetailForfeitSchema: z.ZodObject<{
    type: z.ZodLiteral<"forfeit">;
    winnerIndex: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    type: "forfeit";
    winnerIndex: number;
}, {
    type: "forfeit";
    winnerIndex: number;
}>;
export declare const TransactionDetailSchema: z.ZodDiscriminatedUnion<"type", [z.ZodObject<{
    type: z.ZodLiteral<"deploy">;
    gridIndex: z.ZodNumber;
    phaseAfter: z.ZodEnum<["setup", "deployment", "combat", "reinforcement", "gameOver"]>;
}, "strip", z.ZodTypeAny, {
    type: "deploy";
    gridIndex: number;
    phaseAfter: "setup" | "deployment" | "combat" | "reinforcement" | "gameOver";
}, {
    type: "deploy";
    gridIndex: number;
    phaseAfter: "setup" | "deployment" | "combat" | "reinforcement" | "gameOver";
}>, z.ZodObject<{
    type: z.ZodLiteral<"attack">;
    combat: z.ZodObject<{
        turnNumber: z.ZodNumber;
        attackerPlayerIndex: z.ZodNumber;
        attackerCard: z.ZodObject<{
            suit: z.ZodEnum<["spades", "hearts", "diamonds", "clubs"]>;
            rank: z.ZodEnum<["A", "2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K"]>;
        }, "strip", z.ZodTypeAny, {
            suit: "spades" | "hearts" | "diamonds" | "clubs";
            rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
        }, {
            suit: "spades" | "hearts" | "diamonds" | "clubs";
            rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
        }>;
        targetColumn: z.ZodNumber;
        baseDamage: z.ZodNumber;
        steps: z.ZodArray<z.ZodObject<{
            target: z.ZodEnum<["frontCard", "backCard", "playerLp"]>;
            card: z.ZodOptional<z.ZodObject<{
                suit: z.ZodEnum<["spades", "hearts", "diamonds", "clubs"]>;
                rank: z.ZodEnum<["A", "2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K"]>;
            }, "strip", z.ZodTypeAny, {
                suit: "spades" | "hearts" | "diamonds" | "clubs";
                rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
            }, {
                suit: "spades" | "hearts" | "diamonds" | "clubs";
                rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
            }>>;
            incomingDamage: z.ZodNumber;
            hpBefore: z.ZodOptional<z.ZodNumber>;
            effectiveHp: z.ZodOptional<z.ZodNumber>;
            absorbed: z.ZodOptional<z.ZodNumber>;
            overflow: z.ZodOptional<z.ZodNumber>;
            damage: z.ZodNumber;
            hpAfter: z.ZodOptional<z.ZodNumber>;
            destroyed: z.ZodOptional<z.ZodBoolean>;
            lpBefore: z.ZodOptional<z.ZodNumber>;
            lpAfter: z.ZodOptional<z.ZodNumber>;
            bonuses: z.ZodOptional<z.ZodArray<z.ZodEnum<["aceInvulnerable", "aceVsAce", "diamondDeathShield", "clubDoubleOverflow", "spadeDoubleLp", "heartDeathShield"]>, "many">>;
        }, "strip", z.ZodTypeAny, {
            target: "frontCard" | "backCard" | "playerLp";
            incomingDamage: number;
            damage: number;
            card?: {
                suit: "spades" | "hearts" | "diamonds" | "clubs";
                rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
            } | undefined;
            hpBefore?: number | undefined;
            effectiveHp?: number | undefined;
            absorbed?: number | undefined;
            overflow?: number | undefined;
            hpAfter?: number | undefined;
            destroyed?: boolean | undefined;
            lpBefore?: number | undefined;
            lpAfter?: number | undefined;
            bonuses?: ("aceInvulnerable" | "aceVsAce" | "diamondDeathShield" | "clubDoubleOverflow" | "spadeDoubleLp" | "heartDeathShield")[] | undefined;
        }, {
            target: "frontCard" | "backCard" | "playerLp";
            incomingDamage: number;
            damage: number;
            card?: {
                suit: "spades" | "hearts" | "diamonds" | "clubs";
                rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
            } | undefined;
            hpBefore?: number | undefined;
            effectiveHp?: number | undefined;
            absorbed?: number | undefined;
            overflow?: number | undefined;
            hpAfter?: number | undefined;
            destroyed?: boolean | undefined;
            lpBefore?: number | undefined;
            lpAfter?: number | undefined;
            bonuses?: ("aceInvulnerable" | "aceVsAce" | "diamondDeathShield" | "clubDoubleOverflow" | "spadeDoubleLp" | "heartDeathShield")[] | undefined;
        }>, "many">;
        totalLpDamage: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        turnNumber: number;
        attackerPlayerIndex: number;
        attackerCard: {
            suit: "spades" | "hearts" | "diamonds" | "clubs";
            rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
        };
        targetColumn: number;
        baseDamage: number;
        steps: {
            target: "frontCard" | "backCard" | "playerLp";
            incomingDamage: number;
            damage: number;
            card?: {
                suit: "spades" | "hearts" | "diamonds" | "clubs";
                rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
            } | undefined;
            hpBefore?: number | undefined;
            effectiveHp?: number | undefined;
            absorbed?: number | undefined;
            overflow?: number | undefined;
            hpAfter?: number | undefined;
            destroyed?: boolean | undefined;
            lpBefore?: number | undefined;
            lpAfter?: number | undefined;
            bonuses?: ("aceInvulnerable" | "aceVsAce" | "diamondDeathShield" | "clubDoubleOverflow" | "spadeDoubleLp" | "heartDeathShield")[] | undefined;
        }[];
        totalLpDamage: number;
    }, {
        turnNumber: number;
        attackerPlayerIndex: number;
        attackerCard: {
            suit: "spades" | "hearts" | "diamonds" | "clubs";
            rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
        };
        targetColumn: number;
        baseDamage: number;
        steps: {
            target: "frontCard" | "backCard" | "playerLp";
            incomingDamage: number;
            damage: number;
            card?: {
                suit: "spades" | "hearts" | "diamonds" | "clubs";
                rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
            } | undefined;
            hpBefore?: number | undefined;
            effectiveHp?: number | undefined;
            absorbed?: number | undefined;
            overflow?: number | undefined;
            hpAfter?: number | undefined;
            destroyed?: boolean | undefined;
            lpBefore?: number | undefined;
            lpAfter?: number | undefined;
            bonuses?: ("aceInvulnerable" | "aceVsAce" | "diamondDeathShield" | "clubDoubleOverflow" | "spadeDoubleLp" | "heartDeathShield")[] | undefined;
        }[];
        totalLpDamage: number;
    }>;
    reinforcementTriggered: z.ZodBoolean;
    victoryTriggered: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    type: "attack";
    combat: {
        turnNumber: number;
        attackerPlayerIndex: number;
        attackerCard: {
            suit: "spades" | "hearts" | "diamonds" | "clubs";
            rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
        };
        targetColumn: number;
        baseDamage: number;
        steps: {
            target: "frontCard" | "backCard" | "playerLp";
            incomingDamage: number;
            damage: number;
            card?: {
                suit: "spades" | "hearts" | "diamonds" | "clubs";
                rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
            } | undefined;
            hpBefore?: number | undefined;
            effectiveHp?: number | undefined;
            absorbed?: number | undefined;
            overflow?: number | undefined;
            hpAfter?: number | undefined;
            destroyed?: boolean | undefined;
            lpBefore?: number | undefined;
            lpAfter?: number | undefined;
            bonuses?: ("aceInvulnerable" | "aceVsAce" | "diamondDeathShield" | "clubDoubleOverflow" | "spadeDoubleLp" | "heartDeathShield")[] | undefined;
        }[];
        totalLpDamage: number;
    };
    reinforcementTriggered: boolean;
    victoryTriggered: boolean;
}, {
    type: "attack";
    combat: {
        turnNumber: number;
        attackerPlayerIndex: number;
        attackerCard: {
            suit: "spades" | "hearts" | "diamonds" | "clubs";
            rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
        };
        targetColumn: number;
        baseDamage: number;
        steps: {
            target: "frontCard" | "backCard" | "playerLp";
            incomingDamage: number;
            damage: number;
            card?: {
                suit: "spades" | "hearts" | "diamonds" | "clubs";
                rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
            } | undefined;
            hpBefore?: number | undefined;
            effectiveHp?: number | undefined;
            absorbed?: number | undefined;
            overflow?: number | undefined;
            hpAfter?: number | undefined;
            destroyed?: boolean | undefined;
            lpBefore?: number | undefined;
            lpAfter?: number | undefined;
            bonuses?: ("aceInvulnerable" | "aceVsAce" | "diamondDeathShield" | "clubDoubleOverflow" | "spadeDoubleLp" | "heartDeathShield")[] | undefined;
        }[];
        totalLpDamage: number;
    };
    reinforcementTriggered: boolean;
    victoryTriggered: boolean;
}>, z.ZodObject<{
    type: z.ZodLiteral<"pass">;
}, "strip", z.ZodTypeAny, {
    type: "pass";
}, {
    type: "pass";
}>, z.ZodObject<{
    type: z.ZodLiteral<"reinforce">;
    column: z.ZodNumber;
    gridIndex: z.ZodNumber;
    cardsDrawn: z.ZodNumber;
    reinforcementComplete: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    type: "reinforce";
    column: number;
    gridIndex: number;
    cardsDrawn: number;
    reinforcementComplete: boolean;
}, {
    type: "reinforce";
    column: number;
    gridIndex: number;
    cardsDrawn: number;
    reinforcementComplete: boolean;
}>, z.ZodObject<{
    type: z.ZodLiteral<"forfeit">;
    winnerIndex: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    type: "forfeit";
    winnerIndex: number;
}, {
    type: "forfeit";
    winnerIndex: number;
}>]>;
export declare const TransactionLogEntrySchema: z.ZodObject<{
    sequenceNumber: z.ZodNumber;
    action: z.ZodDiscriminatedUnion<"type", [z.ZodObject<{
        type: z.ZodLiteral<"deploy">;
        playerIndex: z.ZodNumber;
        card: z.ZodObject<{
            suit: z.ZodEnum<["spades", "hearts", "diamonds", "clubs"]>;
            rank: z.ZodEnum<["A", "2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K"]>;
        }, "strip", z.ZodTypeAny, {
            suit: "spades" | "hearts" | "diamonds" | "clubs";
            rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
        }, {
            suit: "spades" | "hearts" | "diamonds" | "clubs";
            rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
        }>;
        column: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        type: "deploy";
        card: {
            suit: "spades" | "hearts" | "diamonds" | "clubs";
            rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
        };
        column: number;
        playerIndex: number;
    }, {
        type: "deploy";
        card: {
            suit: "spades" | "hearts" | "diamonds" | "clubs";
            rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
        };
        column: number;
        playerIndex: number;
    }>, z.ZodObject<{
        type: z.ZodLiteral<"attack">;
        playerIndex: z.ZodNumber;
        attackerPosition: z.ZodObject<{
            row: z.ZodNumber;
            col: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            row: number;
            col: number;
        }, {
            row: number;
            col: number;
        }>;
        targetPosition: z.ZodObject<{
            row: z.ZodNumber;
            col: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            row: number;
            col: number;
        }, {
            row: number;
            col: number;
        }>;
    }, "strip", z.ZodTypeAny, {
        type: "attack";
        playerIndex: number;
        attackerPosition: {
            row: number;
            col: number;
        };
        targetPosition: {
            row: number;
            col: number;
        };
    }, {
        type: "attack";
        playerIndex: number;
        attackerPosition: {
            row: number;
            col: number;
        };
        targetPosition: {
            row: number;
            col: number;
        };
    }>, z.ZodObject<{
        type: z.ZodLiteral<"pass">;
        playerIndex: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        type: "pass";
        playerIndex: number;
    }, {
        type: "pass";
        playerIndex: number;
    }>, z.ZodObject<{
        type: z.ZodLiteral<"reinforce">;
        playerIndex: z.ZodNumber;
        card: z.ZodObject<{
            suit: z.ZodEnum<["spades", "hearts", "diamonds", "clubs"]>;
            rank: z.ZodEnum<["A", "2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K"]>;
        }, "strip", z.ZodTypeAny, {
            suit: "spades" | "hearts" | "diamonds" | "clubs";
            rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
        }, {
            suit: "spades" | "hearts" | "diamonds" | "clubs";
            rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
        }>;
    }, "strip", z.ZodTypeAny, {
        type: "reinforce";
        card: {
            suit: "spades" | "hearts" | "diamonds" | "clubs";
            rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
        };
        playerIndex: number;
    }, {
        type: "reinforce";
        card: {
            suit: "spades" | "hearts" | "diamonds" | "clubs";
            rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
        };
        playerIndex: number;
    }>, z.ZodObject<{
        type: z.ZodLiteral<"forfeit">;
        playerIndex: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        type: "forfeit";
        playerIndex: number;
    }, {
        type: "forfeit";
        playerIndex: number;
    }>]>;
    stateHashBefore: z.ZodString;
    stateHashAfter: z.ZodString;
    timestamp: z.ZodString;
    details: z.ZodDiscriminatedUnion<"type", [z.ZodObject<{
        type: z.ZodLiteral<"deploy">;
        gridIndex: z.ZodNumber;
        phaseAfter: z.ZodEnum<["setup", "deployment", "combat", "reinforcement", "gameOver"]>;
    }, "strip", z.ZodTypeAny, {
        type: "deploy";
        gridIndex: number;
        phaseAfter: "setup" | "deployment" | "combat" | "reinforcement" | "gameOver";
    }, {
        type: "deploy";
        gridIndex: number;
        phaseAfter: "setup" | "deployment" | "combat" | "reinforcement" | "gameOver";
    }>, z.ZodObject<{
        type: z.ZodLiteral<"attack">;
        combat: z.ZodObject<{
            turnNumber: z.ZodNumber;
            attackerPlayerIndex: z.ZodNumber;
            attackerCard: z.ZodObject<{
                suit: z.ZodEnum<["spades", "hearts", "diamonds", "clubs"]>;
                rank: z.ZodEnum<["A", "2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K"]>;
            }, "strip", z.ZodTypeAny, {
                suit: "spades" | "hearts" | "diamonds" | "clubs";
                rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
            }, {
                suit: "spades" | "hearts" | "diamonds" | "clubs";
                rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
            }>;
            targetColumn: z.ZodNumber;
            baseDamage: z.ZodNumber;
            steps: z.ZodArray<z.ZodObject<{
                target: z.ZodEnum<["frontCard", "backCard", "playerLp"]>;
                card: z.ZodOptional<z.ZodObject<{
                    suit: z.ZodEnum<["spades", "hearts", "diamonds", "clubs"]>;
                    rank: z.ZodEnum<["A", "2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K"]>;
                }, "strip", z.ZodTypeAny, {
                    suit: "spades" | "hearts" | "diamonds" | "clubs";
                    rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                }, {
                    suit: "spades" | "hearts" | "diamonds" | "clubs";
                    rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                }>>;
                incomingDamage: z.ZodNumber;
                hpBefore: z.ZodOptional<z.ZodNumber>;
                effectiveHp: z.ZodOptional<z.ZodNumber>;
                absorbed: z.ZodOptional<z.ZodNumber>;
                overflow: z.ZodOptional<z.ZodNumber>;
                damage: z.ZodNumber;
                hpAfter: z.ZodOptional<z.ZodNumber>;
                destroyed: z.ZodOptional<z.ZodBoolean>;
                lpBefore: z.ZodOptional<z.ZodNumber>;
                lpAfter: z.ZodOptional<z.ZodNumber>;
                bonuses: z.ZodOptional<z.ZodArray<z.ZodEnum<["aceInvulnerable", "aceVsAce", "diamondDeathShield", "clubDoubleOverflow", "spadeDoubleLp", "heartDeathShield"]>, "many">>;
            }, "strip", z.ZodTypeAny, {
                target: "frontCard" | "backCard" | "playerLp";
                incomingDamage: number;
                damage: number;
                card?: {
                    suit: "spades" | "hearts" | "diamonds" | "clubs";
                    rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                } | undefined;
                hpBefore?: number | undefined;
                effectiveHp?: number | undefined;
                absorbed?: number | undefined;
                overflow?: number | undefined;
                hpAfter?: number | undefined;
                destroyed?: boolean | undefined;
                lpBefore?: number | undefined;
                lpAfter?: number | undefined;
                bonuses?: ("aceInvulnerable" | "aceVsAce" | "diamondDeathShield" | "clubDoubleOverflow" | "spadeDoubleLp" | "heartDeathShield")[] | undefined;
            }, {
                target: "frontCard" | "backCard" | "playerLp";
                incomingDamage: number;
                damage: number;
                card?: {
                    suit: "spades" | "hearts" | "diamonds" | "clubs";
                    rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                } | undefined;
                hpBefore?: number | undefined;
                effectiveHp?: number | undefined;
                absorbed?: number | undefined;
                overflow?: number | undefined;
                hpAfter?: number | undefined;
                destroyed?: boolean | undefined;
                lpBefore?: number | undefined;
                lpAfter?: number | undefined;
                bonuses?: ("aceInvulnerable" | "aceVsAce" | "diamondDeathShield" | "clubDoubleOverflow" | "spadeDoubleLp" | "heartDeathShield")[] | undefined;
            }>, "many">;
            totalLpDamage: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            turnNumber: number;
            attackerPlayerIndex: number;
            attackerCard: {
                suit: "spades" | "hearts" | "diamonds" | "clubs";
                rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
            };
            targetColumn: number;
            baseDamage: number;
            steps: {
                target: "frontCard" | "backCard" | "playerLp";
                incomingDamage: number;
                damage: number;
                card?: {
                    suit: "spades" | "hearts" | "diamonds" | "clubs";
                    rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                } | undefined;
                hpBefore?: number | undefined;
                effectiveHp?: number | undefined;
                absorbed?: number | undefined;
                overflow?: number | undefined;
                hpAfter?: number | undefined;
                destroyed?: boolean | undefined;
                lpBefore?: number | undefined;
                lpAfter?: number | undefined;
                bonuses?: ("aceInvulnerable" | "aceVsAce" | "diamondDeathShield" | "clubDoubleOverflow" | "spadeDoubleLp" | "heartDeathShield")[] | undefined;
            }[];
            totalLpDamage: number;
        }, {
            turnNumber: number;
            attackerPlayerIndex: number;
            attackerCard: {
                suit: "spades" | "hearts" | "diamonds" | "clubs";
                rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
            };
            targetColumn: number;
            baseDamage: number;
            steps: {
                target: "frontCard" | "backCard" | "playerLp";
                incomingDamage: number;
                damage: number;
                card?: {
                    suit: "spades" | "hearts" | "diamonds" | "clubs";
                    rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                } | undefined;
                hpBefore?: number | undefined;
                effectiveHp?: number | undefined;
                absorbed?: number | undefined;
                overflow?: number | undefined;
                hpAfter?: number | undefined;
                destroyed?: boolean | undefined;
                lpBefore?: number | undefined;
                lpAfter?: number | undefined;
                bonuses?: ("aceInvulnerable" | "aceVsAce" | "diamondDeathShield" | "clubDoubleOverflow" | "spadeDoubleLp" | "heartDeathShield")[] | undefined;
            }[];
            totalLpDamage: number;
        }>;
        reinforcementTriggered: z.ZodBoolean;
        victoryTriggered: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        type: "attack";
        combat: {
            turnNumber: number;
            attackerPlayerIndex: number;
            attackerCard: {
                suit: "spades" | "hearts" | "diamonds" | "clubs";
                rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
            };
            targetColumn: number;
            baseDamage: number;
            steps: {
                target: "frontCard" | "backCard" | "playerLp";
                incomingDamage: number;
                damage: number;
                card?: {
                    suit: "spades" | "hearts" | "diamonds" | "clubs";
                    rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                } | undefined;
                hpBefore?: number | undefined;
                effectiveHp?: number | undefined;
                absorbed?: number | undefined;
                overflow?: number | undefined;
                hpAfter?: number | undefined;
                destroyed?: boolean | undefined;
                lpBefore?: number | undefined;
                lpAfter?: number | undefined;
                bonuses?: ("aceInvulnerable" | "aceVsAce" | "diamondDeathShield" | "clubDoubleOverflow" | "spadeDoubleLp" | "heartDeathShield")[] | undefined;
            }[];
            totalLpDamage: number;
        };
        reinforcementTriggered: boolean;
        victoryTriggered: boolean;
    }, {
        type: "attack";
        combat: {
            turnNumber: number;
            attackerPlayerIndex: number;
            attackerCard: {
                suit: "spades" | "hearts" | "diamonds" | "clubs";
                rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
            };
            targetColumn: number;
            baseDamage: number;
            steps: {
                target: "frontCard" | "backCard" | "playerLp";
                incomingDamage: number;
                damage: number;
                card?: {
                    suit: "spades" | "hearts" | "diamonds" | "clubs";
                    rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                } | undefined;
                hpBefore?: number | undefined;
                effectiveHp?: number | undefined;
                absorbed?: number | undefined;
                overflow?: number | undefined;
                hpAfter?: number | undefined;
                destroyed?: boolean | undefined;
                lpBefore?: number | undefined;
                lpAfter?: number | undefined;
                bonuses?: ("aceInvulnerable" | "aceVsAce" | "diamondDeathShield" | "clubDoubleOverflow" | "spadeDoubleLp" | "heartDeathShield")[] | undefined;
            }[];
            totalLpDamage: number;
        };
        reinforcementTriggered: boolean;
        victoryTriggered: boolean;
    }>, z.ZodObject<{
        type: z.ZodLiteral<"pass">;
    }, "strip", z.ZodTypeAny, {
        type: "pass";
    }, {
        type: "pass";
    }>, z.ZodObject<{
        type: z.ZodLiteral<"reinforce">;
        column: z.ZodNumber;
        gridIndex: z.ZodNumber;
        cardsDrawn: z.ZodNumber;
        reinforcementComplete: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        type: "reinforce";
        column: number;
        gridIndex: number;
        cardsDrawn: number;
        reinforcementComplete: boolean;
    }, {
        type: "reinforce";
        column: number;
        gridIndex: number;
        cardsDrawn: number;
        reinforcementComplete: boolean;
    }>, z.ZodObject<{
        type: z.ZodLiteral<"forfeit">;
        winnerIndex: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        type: "forfeit";
        winnerIndex: number;
    }, {
        type: "forfeit";
        winnerIndex: number;
    }>]>;
}, "strip", z.ZodTypeAny, {
    timestamp: string;
    details: {
        type: "deploy";
        gridIndex: number;
        phaseAfter: "setup" | "deployment" | "combat" | "reinforcement" | "gameOver";
    } | {
        type: "attack";
        combat: {
            turnNumber: number;
            attackerPlayerIndex: number;
            attackerCard: {
                suit: "spades" | "hearts" | "diamonds" | "clubs";
                rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
            };
            targetColumn: number;
            baseDamage: number;
            steps: {
                target: "frontCard" | "backCard" | "playerLp";
                incomingDamage: number;
                damage: number;
                card?: {
                    suit: "spades" | "hearts" | "diamonds" | "clubs";
                    rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                } | undefined;
                hpBefore?: number | undefined;
                effectiveHp?: number | undefined;
                absorbed?: number | undefined;
                overflow?: number | undefined;
                hpAfter?: number | undefined;
                destroyed?: boolean | undefined;
                lpBefore?: number | undefined;
                lpAfter?: number | undefined;
                bonuses?: ("aceInvulnerable" | "aceVsAce" | "diamondDeathShield" | "clubDoubleOverflow" | "spadeDoubleLp" | "heartDeathShield")[] | undefined;
            }[];
            totalLpDamage: number;
        };
        reinforcementTriggered: boolean;
        victoryTriggered: boolean;
    } | {
        type: "pass";
    } | {
        type: "reinforce";
        column: number;
        gridIndex: number;
        cardsDrawn: number;
        reinforcementComplete: boolean;
    } | {
        type: "forfeit";
        winnerIndex: number;
    };
    sequenceNumber: number;
    action: {
        type: "deploy";
        card: {
            suit: "spades" | "hearts" | "diamonds" | "clubs";
            rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
        };
        column: number;
        playerIndex: number;
    } | {
        type: "attack";
        playerIndex: number;
        attackerPosition: {
            row: number;
            col: number;
        };
        targetPosition: {
            row: number;
            col: number;
        };
    } | {
        type: "pass";
        playerIndex: number;
    } | {
        type: "reinforce";
        card: {
            suit: "spades" | "hearts" | "diamonds" | "clubs";
            rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
        };
        playerIndex: number;
    } | {
        type: "forfeit";
        playerIndex: number;
    };
    stateHashBefore: string;
    stateHashAfter: string;
}, {
    timestamp: string;
    details: {
        type: "deploy";
        gridIndex: number;
        phaseAfter: "setup" | "deployment" | "combat" | "reinforcement" | "gameOver";
    } | {
        type: "attack";
        combat: {
            turnNumber: number;
            attackerPlayerIndex: number;
            attackerCard: {
                suit: "spades" | "hearts" | "diamonds" | "clubs";
                rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
            };
            targetColumn: number;
            baseDamage: number;
            steps: {
                target: "frontCard" | "backCard" | "playerLp";
                incomingDamage: number;
                damage: number;
                card?: {
                    suit: "spades" | "hearts" | "diamonds" | "clubs";
                    rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                } | undefined;
                hpBefore?: number | undefined;
                effectiveHp?: number | undefined;
                absorbed?: number | undefined;
                overflow?: number | undefined;
                hpAfter?: number | undefined;
                destroyed?: boolean | undefined;
                lpBefore?: number | undefined;
                lpAfter?: number | undefined;
                bonuses?: ("aceInvulnerable" | "aceVsAce" | "diamondDeathShield" | "clubDoubleOverflow" | "spadeDoubleLp" | "heartDeathShield")[] | undefined;
            }[];
            totalLpDamage: number;
        };
        reinforcementTriggered: boolean;
        victoryTriggered: boolean;
    } | {
        type: "pass";
    } | {
        type: "reinforce";
        column: number;
        gridIndex: number;
        cardsDrawn: number;
        reinforcementComplete: boolean;
    } | {
        type: "forfeit";
        winnerIndex: number;
    };
    sequenceNumber: number;
    action: {
        type: "deploy";
        card: {
            suit: "spades" | "hearts" | "diamonds" | "clubs";
            rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
        };
        column: number;
        playerIndex: number;
    } | {
        type: "attack";
        playerIndex: number;
        attackerPosition: {
            row: number;
            col: number;
        };
        targetPosition: {
            row: number;
            col: number;
        };
    } | {
        type: "pass";
        playerIndex: number;
    } | {
        type: "reinforce";
        card: {
            suit: "spades" | "hearts" | "diamonds" | "clubs";
            rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
        };
        playerIndex: number;
    } | {
        type: "forfeit";
        playerIndex: number;
    };
    stateHashBefore: string;
    stateHashAfter: string;
}>;
export declare const GameStateSchema: z.ZodObject<{
    players: z.ZodArray<z.ZodObject<{
        player: z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            id: string;
            name: string;
        }, {
            id: string;
            name: string;
        }>;
        hand: z.ZodArray<z.ZodObject<{
            suit: z.ZodEnum<["spades", "hearts", "diamonds", "clubs"]>;
            rank: z.ZodEnum<["A", "2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K"]>;
        }, "strip", z.ZodTypeAny, {
            suit: "spades" | "hearts" | "diamonds" | "clubs";
            rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
        }, {
            suit: "spades" | "hearts" | "diamonds" | "clubs";
            rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
        }>, "many">;
        battlefield: z.ZodArray<z.ZodUnion<[z.ZodObject<{
            card: z.ZodObject<{
                suit: z.ZodEnum<["spades", "hearts", "diamonds", "clubs"]>;
                rank: z.ZodEnum<["A", "2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K"]>;
            }, "strip", z.ZodTypeAny, {
                suit: "spades" | "hearts" | "diamonds" | "clubs";
                rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
            }, {
                suit: "spades" | "hearts" | "diamonds" | "clubs";
                rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
            }>;
            position: z.ZodObject<{
                row: z.ZodNumber;
                col: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                row: number;
                col: number;
            }, {
                row: number;
                col: number;
            }>;
            currentHp: z.ZodNumber;
            faceDown: z.ZodBoolean;
        }, "strip", z.ZodTypeAny, {
            card: {
                suit: "spades" | "hearts" | "diamonds" | "clubs";
                rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
            };
            position: {
                row: number;
                col: number;
            };
            currentHp: number;
            faceDown: boolean;
        }, {
            card: {
                suit: "spades" | "hearts" | "diamonds" | "clubs";
                rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
            };
            position: {
                row: number;
                col: number;
            };
            currentHp: number;
            faceDown: boolean;
        }>, z.ZodNull]>, "many">;
        drawpile: z.ZodArray<z.ZodObject<{
            suit: z.ZodEnum<["spades", "hearts", "diamonds", "clubs"]>;
            rank: z.ZodEnum<["A", "2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K"]>;
        }, "strip", z.ZodTypeAny, {
            suit: "spades" | "hearts" | "diamonds" | "clubs";
            rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
        }, {
            suit: "spades" | "hearts" | "diamonds" | "clubs";
            rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
        }>, "many">;
        discardPile: z.ZodArray<z.ZodObject<{
            suit: z.ZodEnum<["spades", "hearts", "diamonds", "clubs"]>;
            rank: z.ZodEnum<["A", "2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K"]>;
        }, "strip", z.ZodTypeAny, {
            suit: "spades" | "hearts" | "diamonds" | "clubs";
            rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
        }, {
            suit: "spades" | "hearts" | "diamonds" | "clubs";
            rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
        }>, "many">;
        lifepoints: z.ZodNumber;
        handCount: z.ZodOptional<z.ZodNumber>;
        drawpileCount: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        player: {
            id: string;
            name: string;
        };
        hand: {
            suit: "spades" | "hearts" | "diamonds" | "clubs";
            rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
        }[];
        battlefield: ({
            card: {
                suit: "spades" | "hearts" | "diamonds" | "clubs";
                rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
            };
            position: {
                row: number;
                col: number;
            };
            currentHp: number;
            faceDown: boolean;
        } | null)[];
        drawpile: {
            suit: "spades" | "hearts" | "diamonds" | "clubs";
            rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
        }[];
        discardPile: {
            suit: "spades" | "hearts" | "diamonds" | "clubs";
            rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
        }[];
        lifepoints: number;
        handCount?: number | undefined;
        drawpileCount?: number | undefined;
    }, {
        player: {
            id: string;
            name: string;
        };
        hand: {
            suit: "spades" | "hearts" | "diamonds" | "clubs";
            rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
        }[];
        battlefield: ({
            card: {
                suit: "spades" | "hearts" | "diamonds" | "clubs";
                rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
            };
            position: {
                row: number;
                col: number;
            };
            currentHp: number;
            faceDown: boolean;
        } | null)[];
        drawpile: {
            suit: "spades" | "hearts" | "diamonds" | "clubs";
            rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
        }[];
        discardPile: {
            suit: "spades" | "hearts" | "diamonds" | "clubs";
            rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
        }[];
        lifepoints: number;
        handCount?: number | undefined;
        drawpileCount?: number | undefined;
    }>, "many">;
    activePlayerIndex: z.ZodNumber;
    phase: z.ZodEnum<["setup", "deployment", "combat", "reinforcement", "gameOver"]>;
    turnNumber: z.ZodNumber;
    rngSeed: z.ZodNumber;
    deploymentOrder: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
    reinforcement: z.ZodOptional<z.ZodObject<{
        column: z.ZodNumber;
        attackerIndex: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        column: number;
        attackerIndex: number;
    }, {
        column: number;
        attackerIndex: number;
    }>>;
    transactionLog: z.ZodOptional<z.ZodArray<z.ZodObject<{
        sequenceNumber: z.ZodNumber;
        action: z.ZodDiscriminatedUnion<"type", [z.ZodObject<{
            type: z.ZodLiteral<"deploy">;
            playerIndex: z.ZodNumber;
            card: z.ZodObject<{
                suit: z.ZodEnum<["spades", "hearts", "diamonds", "clubs"]>;
                rank: z.ZodEnum<["A", "2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K"]>;
            }, "strip", z.ZodTypeAny, {
                suit: "spades" | "hearts" | "diamonds" | "clubs";
                rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
            }, {
                suit: "spades" | "hearts" | "diamonds" | "clubs";
                rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
            }>;
            column: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            type: "deploy";
            card: {
                suit: "spades" | "hearts" | "diamonds" | "clubs";
                rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
            };
            column: number;
            playerIndex: number;
        }, {
            type: "deploy";
            card: {
                suit: "spades" | "hearts" | "diamonds" | "clubs";
                rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
            };
            column: number;
            playerIndex: number;
        }>, z.ZodObject<{
            type: z.ZodLiteral<"attack">;
            playerIndex: z.ZodNumber;
            attackerPosition: z.ZodObject<{
                row: z.ZodNumber;
                col: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                row: number;
                col: number;
            }, {
                row: number;
                col: number;
            }>;
            targetPosition: z.ZodObject<{
                row: z.ZodNumber;
                col: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                row: number;
                col: number;
            }, {
                row: number;
                col: number;
            }>;
        }, "strip", z.ZodTypeAny, {
            type: "attack";
            playerIndex: number;
            attackerPosition: {
                row: number;
                col: number;
            };
            targetPosition: {
                row: number;
                col: number;
            };
        }, {
            type: "attack";
            playerIndex: number;
            attackerPosition: {
                row: number;
                col: number;
            };
            targetPosition: {
                row: number;
                col: number;
            };
        }>, z.ZodObject<{
            type: z.ZodLiteral<"pass">;
            playerIndex: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            type: "pass";
            playerIndex: number;
        }, {
            type: "pass";
            playerIndex: number;
        }>, z.ZodObject<{
            type: z.ZodLiteral<"reinforce">;
            playerIndex: z.ZodNumber;
            card: z.ZodObject<{
                suit: z.ZodEnum<["spades", "hearts", "diamonds", "clubs"]>;
                rank: z.ZodEnum<["A", "2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K"]>;
            }, "strip", z.ZodTypeAny, {
                suit: "spades" | "hearts" | "diamonds" | "clubs";
                rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
            }, {
                suit: "spades" | "hearts" | "diamonds" | "clubs";
                rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
            }>;
        }, "strip", z.ZodTypeAny, {
            type: "reinforce";
            card: {
                suit: "spades" | "hearts" | "diamonds" | "clubs";
                rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
            };
            playerIndex: number;
        }, {
            type: "reinforce";
            card: {
                suit: "spades" | "hearts" | "diamonds" | "clubs";
                rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
            };
            playerIndex: number;
        }>, z.ZodObject<{
            type: z.ZodLiteral<"forfeit">;
            playerIndex: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            type: "forfeit";
            playerIndex: number;
        }, {
            type: "forfeit";
            playerIndex: number;
        }>]>;
        stateHashBefore: z.ZodString;
        stateHashAfter: z.ZodString;
        timestamp: z.ZodString;
        details: z.ZodDiscriminatedUnion<"type", [z.ZodObject<{
            type: z.ZodLiteral<"deploy">;
            gridIndex: z.ZodNumber;
            phaseAfter: z.ZodEnum<["setup", "deployment", "combat", "reinforcement", "gameOver"]>;
        }, "strip", z.ZodTypeAny, {
            type: "deploy";
            gridIndex: number;
            phaseAfter: "setup" | "deployment" | "combat" | "reinforcement" | "gameOver";
        }, {
            type: "deploy";
            gridIndex: number;
            phaseAfter: "setup" | "deployment" | "combat" | "reinforcement" | "gameOver";
        }>, z.ZodObject<{
            type: z.ZodLiteral<"attack">;
            combat: z.ZodObject<{
                turnNumber: z.ZodNumber;
                attackerPlayerIndex: z.ZodNumber;
                attackerCard: z.ZodObject<{
                    suit: z.ZodEnum<["spades", "hearts", "diamonds", "clubs"]>;
                    rank: z.ZodEnum<["A", "2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K"]>;
                }, "strip", z.ZodTypeAny, {
                    suit: "spades" | "hearts" | "diamonds" | "clubs";
                    rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                }, {
                    suit: "spades" | "hearts" | "diamonds" | "clubs";
                    rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                }>;
                targetColumn: z.ZodNumber;
                baseDamage: z.ZodNumber;
                steps: z.ZodArray<z.ZodObject<{
                    target: z.ZodEnum<["frontCard", "backCard", "playerLp"]>;
                    card: z.ZodOptional<z.ZodObject<{
                        suit: z.ZodEnum<["spades", "hearts", "diamonds", "clubs"]>;
                        rank: z.ZodEnum<["A", "2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K"]>;
                    }, "strip", z.ZodTypeAny, {
                        suit: "spades" | "hearts" | "diamonds" | "clubs";
                        rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                    }, {
                        suit: "spades" | "hearts" | "diamonds" | "clubs";
                        rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                    }>>;
                    incomingDamage: z.ZodNumber;
                    hpBefore: z.ZodOptional<z.ZodNumber>;
                    effectiveHp: z.ZodOptional<z.ZodNumber>;
                    absorbed: z.ZodOptional<z.ZodNumber>;
                    overflow: z.ZodOptional<z.ZodNumber>;
                    damage: z.ZodNumber;
                    hpAfter: z.ZodOptional<z.ZodNumber>;
                    destroyed: z.ZodOptional<z.ZodBoolean>;
                    lpBefore: z.ZodOptional<z.ZodNumber>;
                    lpAfter: z.ZodOptional<z.ZodNumber>;
                    bonuses: z.ZodOptional<z.ZodArray<z.ZodEnum<["aceInvulnerable", "aceVsAce", "diamondDeathShield", "clubDoubleOverflow", "spadeDoubleLp", "heartDeathShield"]>, "many">>;
                }, "strip", z.ZodTypeAny, {
                    target: "frontCard" | "backCard" | "playerLp";
                    incomingDamage: number;
                    damage: number;
                    card?: {
                        suit: "spades" | "hearts" | "diamonds" | "clubs";
                        rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                    } | undefined;
                    hpBefore?: number | undefined;
                    effectiveHp?: number | undefined;
                    absorbed?: number | undefined;
                    overflow?: number | undefined;
                    hpAfter?: number | undefined;
                    destroyed?: boolean | undefined;
                    lpBefore?: number | undefined;
                    lpAfter?: number | undefined;
                    bonuses?: ("aceInvulnerable" | "aceVsAce" | "diamondDeathShield" | "clubDoubleOverflow" | "spadeDoubleLp" | "heartDeathShield")[] | undefined;
                }, {
                    target: "frontCard" | "backCard" | "playerLp";
                    incomingDamage: number;
                    damage: number;
                    card?: {
                        suit: "spades" | "hearts" | "diamonds" | "clubs";
                        rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                    } | undefined;
                    hpBefore?: number | undefined;
                    effectiveHp?: number | undefined;
                    absorbed?: number | undefined;
                    overflow?: number | undefined;
                    hpAfter?: number | undefined;
                    destroyed?: boolean | undefined;
                    lpBefore?: number | undefined;
                    lpAfter?: number | undefined;
                    bonuses?: ("aceInvulnerable" | "aceVsAce" | "diamondDeathShield" | "clubDoubleOverflow" | "spadeDoubleLp" | "heartDeathShield")[] | undefined;
                }>, "many">;
                totalLpDamage: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                turnNumber: number;
                attackerPlayerIndex: number;
                attackerCard: {
                    suit: "spades" | "hearts" | "diamonds" | "clubs";
                    rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                };
                targetColumn: number;
                baseDamage: number;
                steps: {
                    target: "frontCard" | "backCard" | "playerLp";
                    incomingDamage: number;
                    damage: number;
                    card?: {
                        suit: "spades" | "hearts" | "diamonds" | "clubs";
                        rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                    } | undefined;
                    hpBefore?: number | undefined;
                    effectiveHp?: number | undefined;
                    absorbed?: number | undefined;
                    overflow?: number | undefined;
                    hpAfter?: number | undefined;
                    destroyed?: boolean | undefined;
                    lpBefore?: number | undefined;
                    lpAfter?: number | undefined;
                    bonuses?: ("aceInvulnerable" | "aceVsAce" | "diamondDeathShield" | "clubDoubleOverflow" | "spadeDoubleLp" | "heartDeathShield")[] | undefined;
                }[];
                totalLpDamage: number;
            }, {
                turnNumber: number;
                attackerPlayerIndex: number;
                attackerCard: {
                    suit: "spades" | "hearts" | "diamonds" | "clubs";
                    rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                };
                targetColumn: number;
                baseDamage: number;
                steps: {
                    target: "frontCard" | "backCard" | "playerLp";
                    incomingDamage: number;
                    damage: number;
                    card?: {
                        suit: "spades" | "hearts" | "diamonds" | "clubs";
                        rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                    } | undefined;
                    hpBefore?: number | undefined;
                    effectiveHp?: number | undefined;
                    absorbed?: number | undefined;
                    overflow?: number | undefined;
                    hpAfter?: number | undefined;
                    destroyed?: boolean | undefined;
                    lpBefore?: number | undefined;
                    lpAfter?: number | undefined;
                    bonuses?: ("aceInvulnerable" | "aceVsAce" | "diamondDeathShield" | "clubDoubleOverflow" | "spadeDoubleLp" | "heartDeathShield")[] | undefined;
                }[];
                totalLpDamage: number;
            }>;
            reinforcementTriggered: z.ZodBoolean;
            victoryTriggered: z.ZodBoolean;
        }, "strip", z.ZodTypeAny, {
            type: "attack";
            combat: {
                turnNumber: number;
                attackerPlayerIndex: number;
                attackerCard: {
                    suit: "spades" | "hearts" | "diamonds" | "clubs";
                    rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                };
                targetColumn: number;
                baseDamage: number;
                steps: {
                    target: "frontCard" | "backCard" | "playerLp";
                    incomingDamage: number;
                    damage: number;
                    card?: {
                        suit: "spades" | "hearts" | "diamonds" | "clubs";
                        rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                    } | undefined;
                    hpBefore?: number | undefined;
                    effectiveHp?: number | undefined;
                    absorbed?: number | undefined;
                    overflow?: number | undefined;
                    hpAfter?: number | undefined;
                    destroyed?: boolean | undefined;
                    lpBefore?: number | undefined;
                    lpAfter?: number | undefined;
                    bonuses?: ("aceInvulnerable" | "aceVsAce" | "diamondDeathShield" | "clubDoubleOverflow" | "spadeDoubleLp" | "heartDeathShield")[] | undefined;
                }[];
                totalLpDamage: number;
            };
            reinforcementTriggered: boolean;
            victoryTriggered: boolean;
        }, {
            type: "attack";
            combat: {
                turnNumber: number;
                attackerPlayerIndex: number;
                attackerCard: {
                    suit: "spades" | "hearts" | "diamonds" | "clubs";
                    rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                };
                targetColumn: number;
                baseDamage: number;
                steps: {
                    target: "frontCard" | "backCard" | "playerLp";
                    incomingDamage: number;
                    damage: number;
                    card?: {
                        suit: "spades" | "hearts" | "diamonds" | "clubs";
                        rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                    } | undefined;
                    hpBefore?: number | undefined;
                    effectiveHp?: number | undefined;
                    absorbed?: number | undefined;
                    overflow?: number | undefined;
                    hpAfter?: number | undefined;
                    destroyed?: boolean | undefined;
                    lpBefore?: number | undefined;
                    lpAfter?: number | undefined;
                    bonuses?: ("aceInvulnerable" | "aceVsAce" | "diamondDeathShield" | "clubDoubleOverflow" | "spadeDoubleLp" | "heartDeathShield")[] | undefined;
                }[];
                totalLpDamage: number;
            };
            reinforcementTriggered: boolean;
            victoryTriggered: boolean;
        }>, z.ZodObject<{
            type: z.ZodLiteral<"pass">;
        }, "strip", z.ZodTypeAny, {
            type: "pass";
        }, {
            type: "pass";
        }>, z.ZodObject<{
            type: z.ZodLiteral<"reinforce">;
            column: z.ZodNumber;
            gridIndex: z.ZodNumber;
            cardsDrawn: z.ZodNumber;
            reinforcementComplete: z.ZodBoolean;
        }, "strip", z.ZodTypeAny, {
            type: "reinforce";
            column: number;
            gridIndex: number;
            cardsDrawn: number;
            reinforcementComplete: boolean;
        }, {
            type: "reinforce";
            column: number;
            gridIndex: number;
            cardsDrawn: number;
            reinforcementComplete: boolean;
        }>, z.ZodObject<{
            type: z.ZodLiteral<"forfeit">;
            winnerIndex: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            type: "forfeit";
            winnerIndex: number;
        }, {
            type: "forfeit";
            winnerIndex: number;
        }>]>;
    }, "strip", z.ZodTypeAny, {
        timestamp: string;
        details: {
            type: "deploy";
            gridIndex: number;
            phaseAfter: "setup" | "deployment" | "combat" | "reinforcement" | "gameOver";
        } | {
            type: "attack";
            combat: {
                turnNumber: number;
                attackerPlayerIndex: number;
                attackerCard: {
                    suit: "spades" | "hearts" | "diamonds" | "clubs";
                    rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                };
                targetColumn: number;
                baseDamage: number;
                steps: {
                    target: "frontCard" | "backCard" | "playerLp";
                    incomingDamage: number;
                    damage: number;
                    card?: {
                        suit: "spades" | "hearts" | "diamonds" | "clubs";
                        rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                    } | undefined;
                    hpBefore?: number | undefined;
                    effectiveHp?: number | undefined;
                    absorbed?: number | undefined;
                    overflow?: number | undefined;
                    hpAfter?: number | undefined;
                    destroyed?: boolean | undefined;
                    lpBefore?: number | undefined;
                    lpAfter?: number | undefined;
                    bonuses?: ("aceInvulnerable" | "aceVsAce" | "diamondDeathShield" | "clubDoubleOverflow" | "spadeDoubleLp" | "heartDeathShield")[] | undefined;
                }[];
                totalLpDamage: number;
            };
            reinforcementTriggered: boolean;
            victoryTriggered: boolean;
        } | {
            type: "pass";
        } | {
            type: "reinforce";
            column: number;
            gridIndex: number;
            cardsDrawn: number;
            reinforcementComplete: boolean;
        } | {
            type: "forfeit";
            winnerIndex: number;
        };
        sequenceNumber: number;
        action: {
            type: "deploy";
            card: {
                suit: "spades" | "hearts" | "diamonds" | "clubs";
                rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
            };
            column: number;
            playerIndex: number;
        } | {
            type: "attack";
            playerIndex: number;
            attackerPosition: {
                row: number;
                col: number;
            };
            targetPosition: {
                row: number;
                col: number;
            };
        } | {
            type: "pass";
            playerIndex: number;
        } | {
            type: "reinforce";
            card: {
                suit: "spades" | "hearts" | "diamonds" | "clubs";
                rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
            };
            playerIndex: number;
        } | {
            type: "forfeit";
            playerIndex: number;
        };
        stateHashBefore: string;
        stateHashAfter: string;
    }, {
        timestamp: string;
        details: {
            type: "deploy";
            gridIndex: number;
            phaseAfter: "setup" | "deployment" | "combat" | "reinforcement" | "gameOver";
        } | {
            type: "attack";
            combat: {
                turnNumber: number;
                attackerPlayerIndex: number;
                attackerCard: {
                    suit: "spades" | "hearts" | "diamonds" | "clubs";
                    rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                };
                targetColumn: number;
                baseDamage: number;
                steps: {
                    target: "frontCard" | "backCard" | "playerLp";
                    incomingDamage: number;
                    damage: number;
                    card?: {
                        suit: "spades" | "hearts" | "diamonds" | "clubs";
                        rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                    } | undefined;
                    hpBefore?: number | undefined;
                    effectiveHp?: number | undefined;
                    absorbed?: number | undefined;
                    overflow?: number | undefined;
                    hpAfter?: number | undefined;
                    destroyed?: boolean | undefined;
                    lpBefore?: number | undefined;
                    lpAfter?: number | undefined;
                    bonuses?: ("aceInvulnerable" | "aceVsAce" | "diamondDeathShield" | "clubDoubleOverflow" | "spadeDoubleLp" | "heartDeathShield")[] | undefined;
                }[];
                totalLpDamage: number;
            };
            reinforcementTriggered: boolean;
            victoryTriggered: boolean;
        } | {
            type: "pass";
        } | {
            type: "reinforce";
            column: number;
            gridIndex: number;
            cardsDrawn: number;
            reinforcementComplete: boolean;
        } | {
            type: "forfeit";
            winnerIndex: number;
        };
        sequenceNumber: number;
        action: {
            type: "deploy";
            card: {
                suit: "spades" | "hearts" | "diamonds" | "clubs";
                rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
            };
            column: number;
            playerIndex: number;
        } | {
            type: "attack";
            playerIndex: number;
            attackerPosition: {
                row: number;
                col: number;
            };
            targetPosition: {
                row: number;
                col: number;
            };
        } | {
            type: "pass";
            playerIndex: number;
        } | {
            type: "reinforce";
            card: {
                suit: "spades" | "hearts" | "diamonds" | "clubs";
                rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
            };
            playerIndex: number;
        } | {
            type: "forfeit";
            playerIndex: number;
        };
        stateHashBefore: string;
        stateHashAfter: string;
    }>, "many">>;
    outcome: z.ZodOptional<z.ZodObject<{
        winnerIndex: z.ZodNumber;
        victoryType: z.ZodEnum<["lpDepletion", "cardDepletion", "forfeit"]>;
        turnNumber: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        turnNumber: number;
        winnerIndex: number;
        victoryType: "lpDepletion" | "cardDepletion" | "forfeit";
    }, {
        turnNumber: number;
        winnerIndex: number;
        victoryType: "lpDepletion" | "cardDepletion" | "forfeit";
    }>>;
    gameOptions: z.ZodOptional<z.ZodDefault<z.ZodObject<{
        damageMode: z.ZodDefault<z.ZodEnum<["cumulative", "per-turn"]>>;
    }, "strip", z.ZodTypeAny, {
        damageMode: "cumulative" | "per-turn";
    }, {
        damageMode?: "cumulative" | "per-turn" | undefined;
    }>>>;
}, "strip", z.ZodTypeAny, {
    players: {
        player: {
            id: string;
            name: string;
        };
        hand: {
            suit: "spades" | "hearts" | "diamonds" | "clubs";
            rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
        }[];
        battlefield: ({
            card: {
                suit: "spades" | "hearts" | "diamonds" | "clubs";
                rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
            };
            position: {
                row: number;
                col: number;
            };
            currentHp: number;
            faceDown: boolean;
        } | null)[];
        drawpile: {
            suit: "spades" | "hearts" | "diamonds" | "clubs";
            rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
        }[];
        discardPile: {
            suit: "spades" | "hearts" | "diamonds" | "clubs";
            rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
        }[];
        lifepoints: number;
        handCount?: number | undefined;
        drawpileCount?: number | undefined;
    }[];
    turnNumber: number;
    activePlayerIndex: number;
    phase: "setup" | "deployment" | "combat" | "reinforcement" | "gameOver";
    rngSeed: number;
    reinforcement?: {
        column: number;
        attackerIndex: number;
    } | undefined;
    deploymentOrder?: number[] | undefined;
    transactionLog?: {
        timestamp: string;
        details: {
            type: "deploy";
            gridIndex: number;
            phaseAfter: "setup" | "deployment" | "combat" | "reinforcement" | "gameOver";
        } | {
            type: "attack";
            combat: {
                turnNumber: number;
                attackerPlayerIndex: number;
                attackerCard: {
                    suit: "spades" | "hearts" | "diamonds" | "clubs";
                    rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                };
                targetColumn: number;
                baseDamage: number;
                steps: {
                    target: "frontCard" | "backCard" | "playerLp";
                    incomingDamage: number;
                    damage: number;
                    card?: {
                        suit: "spades" | "hearts" | "diamonds" | "clubs";
                        rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                    } | undefined;
                    hpBefore?: number | undefined;
                    effectiveHp?: number | undefined;
                    absorbed?: number | undefined;
                    overflow?: number | undefined;
                    hpAfter?: number | undefined;
                    destroyed?: boolean | undefined;
                    lpBefore?: number | undefined;
                    lpAfter?: number | undefined;
                    bonuses?: ("aceInvulnerable" | "aceVsAce" | "diamondDeathShield" | "clubDoubleOverflow" | "spadeDoubleLp" | "heartDeathShield")[] | undefined;
                }[];
                totalLpDamage: number;
            };
            reinforcementTriggered: boolean;
            victoryTriggered: boolean;
        } | {
            type: "pass";
        } | {
            type: "reinforce";
            column: number;
            gridIndex: number;
            cardsDrawn: number;
            reinforcementComplete: boolean;
        } | {
            type: "forfeit";
            winnerIndex: number;
        };
        sequenceNumber: number;
        action: {
            type: "deploy";
            card: {
                suit: "spades" | "hearts" | "diamonds" | "clubs";
                rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
            };
            column: number;
            playerIndex: number;
        } | {
            type: "attack";
            playerIndex: number;
            attackerPosition: {
                row: number;
                col: number;
            };
            targetPosition: {
                row: number;
                col: number;
            };
        } | {
            type: "pass";
            playerIndex: number;
        } | {
            type: "reinforce";
            card: {
                suit: "spades" | "hearts" | "diamonds" | "clubs";
                rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
            };
            playerIndex: number;
        } | {
            type: "forfeit";
            playerIndex: number;
        };
        stateHashBefore: string;
        stateHashAfter: string;
    }[] | undefined;
    outcome?: {
        turnNumber: number;
        winnerIndex: number;
        victoryType: "lpDepletion" | "cardDepletion" | "forfeit";
    } | undefined;
    gameOptions?: {
        damageMode: "cumulative" | "per-turn";
    } | undefined;
}, {
    players: {
        player: {
            id: string;
            name: string;
        };
        hand: {
            suit: "spades" | "hearts" | "diamonds" | "clubs";
            rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
        }[];
        battlefield: ({
            card: {
                suit: "spades" | "hearts" | "diamonds" | "clubs";
                rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
            };
            position: {
                row: number;
                col: number;
            };
            currentHp: number;
            faceDown: boolean;
        } | null)[];
        drawpile: {
            suit: "spades" | "hearts" | "diamonds" | "clubs";
            rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
        }[];
        discardPile: {
            suit: "spades" | "hearts" | "diamonds" | "clubs";
            rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
        }[];
        lifepoints: number;
        handCount?: number | undefined;
        drawpileCount?: number | undefined;
    }[];
    turnNumber: number;
    activePlayerIndex: number;
    phase: "setup" | "deployment" | "combat" | "reinforcement" | "gameOver";
    rngSeed: number;
    reinforcement?: {
        column: number;
        attackerIndex: number;
    } | undefined;
    deploymentOrder?: number[] | undefined;
    transactionLog?: {
        timestamp: string;
        details: {
            type: "deploy";
            gridIndex: number;
            phaseAfter: "setup" | "deployment" | "combat" | "reinforcement" | "gameOver";
        } | {
            type: "attack";
            combat: {
                turnNumber: number;
                attackerPlayerIndex: number;
                attackerCard: {
                    suit: "spades" | "hearts" | "diamonds" | "clubs";
                    rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                };
                targetColumn: number;
                baseDamage: number;
                steps: {
                    target: "frontCard" | "backCard" | "playerLp";
                    incomingDamage: number;
                    damage: number;
                    card?: {
                        suit: "spades" | "hearts" | "diamonds" | "clubs";
                        rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                    } | undefined;
                    hpBefore?: number | undefined;
                    effectiveHp?: number | undefined;
                    absorbed?: number | undefined;
                    overflow?: number | undefined;
                    hpAfter?: number | undefined;
                    destroyed?: boolean | undefined;
                    lpBefore?: number | undefined;
                    lpAfter?: number | undefined;
                    bonuses?: ("aceInvulnerable" | "aceVsAce" | "diamondDeathShield" | "clubDoubleOverflow" | "spadeDoubleLp" | "heartDeathShield")[] | undefined;
                }[];
                totalLpDamage: number;
            };
            reinforcementTriggered: boolean;
            victoryTriggered: boolean;
        } | {
            type: "pass";
        } | {
            type: "reinforce";
            column: number;
            gridIndex: number;
            cardsDrawn: number;
            reinforcementComplete: boolean;
        } | {
            type: "forfeit";
            winnerIndex: number;
        };
        sequenceNumber: number;
        action: {
            type: "deploy";
            card: {
                suit: "spades" | "hearts" | "diamonds" | "clubs";
                rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
            };
            column: number;
            playerIndex: number;
        } | {
            type: "attack";
            playerIndex: number;
            attackerPosition: {
                row: number;
                col: number;
            };
            targetPosition: {
                row: number;
                col: number;
            };
        } | {
            type: "pass";
            playerIndex: number;
        } | {
            type: "reinforce";
            card: {
                suit: "spades" | "hearts" | "diamonds" | "clubs";
                rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
            };
            playerIndex: number;
        } | {
            type: "forfeit";
            playerIndex: number;
        };
        stateHashBefore: string;
        stateHashAfter: string;
    }[] | undefined;
    outcome?: {
        turnNumber: number;
        winnerIndex: number;
        victoryType: "lpDepletion" | "cardDepletion" | "forfeit";
    } | undefined;
    gameOptions?: {
        damageMode?: "cumulative" | "per-turn" | undefined;
    } | undefined;
}>;
export declare const ActionResultSchema: z.ZodDiscriminatedUnion<"ok", [z.ZodObject<{
    ok: z.ZodLiteral<true>;
    state: z.ZodObject<{
        players: z.ZodArray<z.ZodObject<{
            player: z.ZodObject<{
                id: z.ZodString;
                name: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                id: string;
                name: string;
            }, {
                id: string;
                name: string;
            }>;
            hand: z.ZodArray<z.ZodObject<{
                suit: z.ZodEnum<["spades", "hearts", "diamonds", "clubs"]>;
                rank: z.ZodEnum<["A", "2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K"]>;
            }, "strip", z.ZodTypeAny, {
                suit: "spades" | "hearts" | "diamonds" | "clubs";
                rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
            }, {
                suit: "spades" | "hearts" | "diamonds" | "clubs";
                rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
            }>, "many">;
            battlefield: z.ZodArray<z.ZodUnion<[z.ZodObject<{
                card: z.ZodObject<{
                    suit: z.ZodEnum<["spades", "hearts", "diamonds", "clubs"]>;
                    rank: z.ZodEnum<["A", "2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K"]>;
                }, "strip", z.ZodTypeAny, {
                    suit: "spades" | "hearts" | "diamonds" | "clubs";
                    rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                }, {
                    suit: "spades" | "hearts" | "diamonds" | "clubs";
                    rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                }>;
                position: z.ZodObject<{
                    row: z.ZodNumber;
                    col: z.ZodNumber;
                }, "strip", z.ZodTypeAny, {
                    row: number;
                    col: number;
                }, {
                    row: number;
                    col: number;
                }>;
                currentHp: z.ZodNumber;
                faceDown: z.ZodBoolean;
            }, "strip", z.ZodTypeAny, {
                card: {
                    suit: "spades" | "hearts" | "diamonds" | "clubs";
                    rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                };
                position: {
                    row: number;
                    col: number;
                };
                currentHp: number;
                faceDown: boolean;
            }, {
                card: {
                    suit: "spades" | "hearts" | "diamonds" | "clubs";
                    rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                };
                position: {
                    row: number;
                    col: number;
                };
                currentHp: number;
                faceDown: boolean;
            }>, z.ZodNull]>, "many">;
            drawpile: z.ZodArray<z.ZodObject<{
                suit: z.ZodEnum<["spades", "hearts", "diamonds", "clubs"]>;
                rank: z.ZodEnum<["A", "2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K"]>;
            }, "strip", z.ZodTypeAny, {
                suit: "spades" | "hearts" | "diamonds" | "clubs";
                rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
            }, {
                suit: "spades" | "hearts" | "diamonds" | "clubs";
                rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
            }>, "many">;
            discardPile: z.ZodArray<z.ZodObject<{
                suit: z.ZodEnum<["spades", "hearts", "diamonds", "clubs"]>;
                rank: z.ZodEnum<["A", "2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K"]>;
            }, "strip", z.ZodTypeAny, {
                suit: "spades" | "hearts" | "diamonds" | "clubs";
                rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
            }, {
                suit: "spades" | "hearts" | "diamonds" | "clubs";
                rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
            }>, "many">;
            lifepoints: z.ZodNumber;
            handCount: z.ZodOptional<z.ZodNumber>;
            drawpileCount: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            player: {
                id: string;
                name: string;
            };
            hand: {
                suit: "spades" | "hearts" | "diamonds" | "clubs";
                rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
            }[];
            battlefield: ({
                card: {
                    suit: "spades" | "hearts" | "diamonds" | "clubs";
                    rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                };
                position: {
                    row: number;
                    col: number;
                };
                currentHp: number;
                faceDown: boolean;
            } | null)[];
            drawpile: {
                suit: "spades" | "hearts" | "diamonds" | "clubs";
                rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
            }[];
            discardPile: {
                suit: "spades" | "hearts" | "diamonds" | "clubs";
                rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
            }[];
            lifepoints: number;
            handCount?: number | undefined;
            drawpileCount?: number | undefined;
        }, {
            player: {
                id: string;
                name: string;
            };
            hand: {
                suit: "spades" | "hearts" | "diamonds" | "clubs";
                rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
            }[];
            battlefield: ({
                card: {
                    suit: "spades" | "hearts" | "diamonds" | "clubs";
                    rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                };
                position: {
                    row: number;
                    col: number;
                };
                currentHp: number;
                faceDown: boolean;
            } | null)[];
            drawpile: {
                suit: "spades" | "hearts" | "diamonds" | "clubs";
                rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
            }[];
            discardPile: {
                suit: "spades" | "hearts" | "diamonds" | "clubs";
                rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
            }[];
            lifepoints: number;
            handCount?: number | undefined;
            drawpileCount?: number | undefined;
        }>, "many">;
        activePlayerIndex: z.ZodNumber;
        phase: z.ZodEnum<["setup", "deployment", "combat", "reinforcement", "gameOver"]>;
        turnNumber: z.ZodNumber;
        rngSeed: z.ZodNumber;
        deploymentOrder: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
        reinforcement: z.ZodOptional<z.ZodObject<{
            column: z.ZodNumber;
            attackerIndex: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            column: number;
            attackerIndex: number;
        }, {
            column: number;
            attackerIndex: number;
        }>>;
        transactionLog: z.ZodOptional<z.ZodArray<z.ZodObject<{
            sequenceNumber: z.ZodNumber;
            action: z.ZodDiscriminatedUnion<"type", [z.ZodObject<{
                type: z.ZodLiteral<"deploy">;
                playerIndex: z.ZodNumber;
                card: z.ZodObject<{
                    suit: z.ZodEnum<["spades", "hearts", "diamonds", "clubs"]>;
                    rank: z.ZodEnum<["A", "2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K"]>;
                }, "strip", z.ZodTypeAny, {
                    suit: "spades" | "hearts" | "diamonds" | "clubs";
                    rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                }, {
                    suit: "spades" | "hearts" | "diamonds" | "clubs";
                    rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                }>;
                column: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                type: "deploy";
                card: {
                    suit: "spades" | "hearts" | "diamonds" | "clubs";
                    rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                };
                column: number;
                playerIndex: number;
            }, {
                type: "deploy";
                card: {
                    suit: "spades" | "hearts" | "diamonds" | "clubs";
                    rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                };
                column: number;
                playerIndex: number;
            }>, z.ZodObject<{
                type: z.ZodLiteral<"attack">;
                playerIndex: z.ZodNumber;
                attackerPosition: z.ZodObject<{
                    row: z.ZodNumber;
                    col: z.ZodNumber;
                }, "strip", z.ZodTypeAny, {
                    row: number;
                    col: number;
                }, {
                    row: number;
                    col: number;
                }>;
                targetPosition: z.ZodObject<{
                    row: z.ZodNumber;
                    col: z.ZodNumber;
                }, "strip", z.ZodTypeAny, {
                    row: number;
                    col: number;
                }, {
                    row: number;
                    col: number;
                }>;
            }, "strip", z.ZodTypeAny, {
                type: "attack";
                playerIndex: number;
                attackerPosition: {
                    row: number;
                    col: number;
                };
                targetPosition: {
                    row: number;
                    col: number;
                };
            }, {
                type: "attack";
                playerIndex: number;
                attackerPosition: {
                    row: number;
                    col: number;
                };
                targetPosition: {
                    row: number;
                    col: number;
                };
            }>, z.ZodObject<{
                type: z.ZodLiteral<"pass">;
                playerIndex: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                type: "pass";
                playerIndex: number;
            }, {
                type: "pass";
                playerIndex: number;
            }>, z.ZodObject<{
                type: z.ZodLiteral<"reinforce">;
                playerIndex: z.ZodNumber;
                card: z.ZodObject<{
                    suit: z.ZodEnum<["spades", "hearts", "diamonds", "clubs"]>;
                    rank: z.ZodEnum<["A", "2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K"]>;
                }, "strip", z.ZodTypeAny, {
                    suit: "spades" | "hearts" | "diamonds" | "clubs";
                    rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                }, {
                    suit: "spades" | "hearts" | "diamonds" | "clubs";
                    rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                }>;
            }, "strip", z.ZodTypeAny, {
                type: "reinforce";
                card: {
                    suit: "spades" | "hearts" | "diamonds" | "clubs";
                    rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                };
                playerIndex: number;
            }, {
                type: "reinforce";
                card: {
                    suit: "spades" | "hearts" | "diamonds" | "clubs";
                    rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                };
                playerIndex: number;
            }>, z.ZodObject<{
                type: z.ZodLiteral<"forfeit">;
                playerIndex: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                type: "forfeit";
                playerIndex: number;
            }, {
                type: "forfeit";
                playerIndex: number;
            }>]>;
            stateHashBefore: z.ZodString;
            stateHashAfter: z.ZodString;
            timestamp: z.ZodString;
            details: z.ZodDiscriminatedUnion<"type", [z.ZodObject<{
                type: z.ZodLiteral<"deploy">;
                gridIndex: z.ZodNumber;
                phaseAfter: z.ZodEnum<["setup", "deployment", "combat", "reinforcement", "gameOver"]>;
            }, "strip", z.ZodTypeAny, {
                type: "deploy";
                gridIndex: number;
                phaseAfter: "setup" | "deployment" | "combat" | "reinforcement" | "gameOver";
            }, {
                type: "deploy";
                gridIndex: number;
                phaseAfter: "setup" | "deployment" | "combat" | "reinforcement" | "gameOver";
            }>, z.ZodObject<{
                type: z.ZodLiteral<"attack">;
                combat: z.ZodObject<{
                    turnNumber: z.ZodNumber;
                    attackerPlayerIndex: z.ZodNumber;
                    attackerCard: z.ZodObject<{
                        suit: z.ZodEnum<["spades", "hearts", "diamonds", "clubs"]>;
                        rank: z.ZodEnum<["A", "2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K"]>;
                    }, "strip", z.ZodTypeAny, {
                        suit: "spades" | "hearts" | "diamonds" | "clubs";
                        rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                    }, {
                        suit: "spades" | "hearts" | "diamonds" | "clubs";
                        rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                    }>;
                    targetColumn: z.ZodNumber;
                    baseDamage: z.ZodNumber;
                    steps: z.ZodArray<z.ZodObject<{
                        target: z.ZodEnum<["frontCard", "backCard", "playerLp"]>;
                        card: z.ZodOptional<z.ZodObject<{
                            suit: z.ZodEnum<["spades", "hearts", "diamonds", "clubs"]>;
                            rank: z.ZodEnum<["A", "2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K"]>;
                        }, "strip", z.ZodTypeAny, {
                            suit: "spades" | "hearts" | "diamonds" | "clubs";
                            rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                        }, {
                            suit: "spades" | "hearts" | "diamonds" | "clubs";
                            rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                        }>>;
                        incomingDamage: z.ZodNumber;
                        hpBefore: z.ZodOptional<z.ZodNumber>;
                        effectiveHp: z.ZodOptional<z.ZodNumber>;
                        absorbed: z.ZodOptional<z.ZodNumber>;
                        overflow: z.ZodOptional<z.ZodNumber>;
                        damage: z.ZodNumber;
                        hpAfter: z.ZodOptional<z.ZodNumber>;
                        destroyed: z.ZodOptional<z.ZodBoolean>;
                        lpBefore: z.ZodOptional<z.ZodNumber>;
                        lpAfter: z.ZodOptional<z.ZodNumber>;
                        bonuses: z.ZodOptional<z.ZodArray<z.ZodEnum<["aceInvulnerable", "aceVsAce", "diamondDeathShield", "clubDoubleOverflow", "spadeDoubleLp", "heartDeathShield"]>, "many">>;
                    }, "strip", z.ZodTypeAny, {
                        target: "frontCard" | "backCard" | "playerLp";
                        incomingDamage: number;
                        damage: number;
                        card?: {
                            suit: "spades" | "hearts" | "diamonds" | "clubs";
                            rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                        } | undefined;
                        hpBefore?: number | undefined;
                        effectiveHp?: number | undefined;
                        absorbed?: number | undefined;
                        overflow?: number | undefined;
                        hpAfter?: number | undefined;
                        destroyed?: boolean | undefined;
                        lpBefore?: number | undefined;
                        lpAfter?: number | undefined;
                        bonuses?: ("aceInvulnerable" | "aceVsAce" | "diamondDeathShield" | "clubDoubleOverflow" | "spadeDoubleLp" | "heartDeathShield")[] | undefined;
                    }, {
                        target: "frontCard" | "backCard" | "playerLp";
                        incomingDamage: number;
                        damage: number;
                        card?: {
                            suit: "spades" | "hearts" | "diamonds" | "clubs";
                            rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                        } | undefined;
                        hpBefore?: number | undefined;
                        effectiveHp?: number | undefined;
                        absorbed?: number | undefined;
                        overflow?: number | undefined;
                        hpAfter?: number | undefined;
                        destroyed?: boolean | undefined;
                        lpBefore?: number | undefined;
                        lpAfter?: number | undefined;
                        bonuses?: ("aceInvulnerable" | "aceVsAce" | "diamondDeathShield" | "clubDoubleOverflow" | "spadeDoubleLp" | "heartDeathShield")[] | undefined;
                    }>, "many">;
                    totalLpDamage: z.ZodNumber;
                }, "strip", z.ZodTypeAny, {
                    turnNumber: number;
                    attackerPlayerIndex: number;
                    attackerCard: {
                        suit: "spades" | "hearts" | "diamonds" | "clubs";
                        rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                    };
                    targetColumn: number;
                    baseDamage: number;
                    steps: {
                        target: "frontCard" | "backCard" | "playerLp";
                        incomingDamage: number;
                        damage: number;
                        card?: {
                            suit: "spades" | "hearts" | "diamonds" | "clubs";
                            rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                        } | undefined;
                        hpBefore?: number | undefined;
                        effectiveHp?: number | undefined;
                        absorbed?: number | undefined;
                        overflow?: number | undefined;
                        hpAfter?: number | undefined;
                        destroyed?: boolean | undefined;
                        lpBefore?: number | undefined;
                        lpAfter?: number | undefined;
                        bonuses?: ("aceInvulnerable" | "aceVsAce" | "diamondDeathShield" | "clubDoubleOverflow" | "spadeDoubleLp" | "heartDeathShield")[] | undefined;
                    }[];
                    totalLpDamage: number;
                }, {
                    turnNumber: number;
                    attackerPlayerIndex: number;
                    attackerCard: {
                        suit: "spades" | "hearts" | "diamonds" | "clubs";
                        rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                    };
                    targetColumn: number;
                    baseDamage: number;
                    steps: {
                        target: "frontCard" | "backCard" | "playerLp";
                        incomingDamage: number;
                        damage: number;
                        card?: {
                            suit: "spades" | "hearts" | "diamonds" | "clubs";
                            rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                        } | undefined;
                        hpBefore?: number | undefined;
                        effectiveHp?: number | undefined;
                        absorbed?: number | undefined;
                        overflow?: number | undefined;
                        hpAfter?: number | undefined;
                        destroyed?: boolean | undefined;
                        lpBefore?: number | undefined;
                        lpAfter?: number | undefined;
                        bonuses?: ("aceInvulnerable" | "aceVsAce" | "diamondDeathShield" | "clubDoubleOverflow" | "spadeDoubleLp" | "heartDeathShield")[] | undefined;
                    }[];
                    totalLpDamage: number;
                }>;
                reinforcementTriggered: z.ZodBoolean;
                victoryTriggered: z.ZodBoolean;
            }, "strip", z.ZodTypeAny, {
                type: "attack";
                combat: {
                    turnNumber: number;
                    attackerPlayerIndex: number;
                    attackerCard: {
                        suit: "spades" | "hearts" | "diamonds" | "clubs";
                        rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                    };
                    targetColumn: number;
                    baseDamage: number;
                    steps: {
                        target: "frontCard" | "backCard" | "playerLp";
                        incomingDamage: number;
                        damage: number;
                        card?: {
                            suit: "spades" | "hearts" | "diamonds" | "clubs";
                            rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                        } | undefined;
                        hpBefore?: number | undefined;
                        effectiveHp?: number | undefined;
                        absorbed?: number | undefined;
                        overflow?: number | undefined;
                        hpAfter?: number | undefined;
                        destroyed?: boolean | undefined;
                        lpBefore?: number | undefined;
                        lpAfter?: number | undefined;
                        bonuses?: ("aceInvulnerable" | "aceVsAce" | "diamondDeathShield" | "clubDoubleOverflow" | "spadeDoubleLp" | "heartDeathShield")[] | undefined;
                    }[];
                    totalLpDamage: number;
                };
                reinforcementTriggered: boolean;
                victoryTriggered: boolean;
            }, {
                type: "attack";
                combat: {
                    turnNumber: number;
                    attackerPlayerIndex: number;
                    attackerCard: {
                        suit: "spades" | "hearts" | "diamonds" | "clubs";
                        rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                    };
                    targetColumn: number;
                    baseDamage: number;
                    steps: {
                        target: "frontCard" | "backCard" | "playerLp";
                        incomingDamage: number;
                        damage: number;
                        card?: {
                            suit: "spades" | "hearts" | "diamonds" | "clubs";
                            rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                        } | undefined;
                        hpBefore?: number | undefined;
                        effectiveHp?: number | undefined;
                        absorbed?: number | undefined;
                        overflow?: number | undefined;
                        hpAfter?: number | undefined;
                        destroyed?: boolean | undefined;
                        lpBefore?: number | undefined;
                        lpAfter?: number | undefined;
                        bonuses?: ("aceInvulnerable" | "aceVsAce" | "diamondDeathShield" | "clubDoubleOverflow" | "spadeDoubleLp" | "heartDeathShield")[] | undefined;
                    }[];
                    totalLpDamage: number;
                };
                reinforcementTriggered: boolean;
                victoryTriggered: boolean;
            }>, z.ZodObject<{
                type: z.ZodLiteral<"pass">;
            }, "strip", z.ZodTypeAny, {
                type: "pass";
            }, {
                type: "pass";
            }>, z.ZodObject<{
                type: z.ZodLiteral<"reinforce">;
                column: z.ZodNumber;
                gridIndex: z.ZodNumber;
                cardsDrawn: z.ZodNumber;
                reinforcementComplete: z.ZodBoolean;
            }, "strip", z.ZodTypeAny, {
                type: "reinforce";
                column: number;
                gridIndex: number;
                cardsDrawn: number;
                reinforcementComplete: boolean;
            }, {
                type: "reinforce";
                column: number;
                gridIndex: number;
                cardsDrawn: number;
                reinforcementComplete: boolean;
            }>, z.ZodObject<{
                type: z.ZodLiteral<"forfeit">;
                winnerIndex: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                type: "forfeit";
                winnerIndex: number;
            }, {
                type: "forfeit";
                winnerIndex: number;
            }>]>;
        }, "strip", z.ZodTypeAny, {
            timestamp: string;
            details: {
                type: "deploy";
                gridIndex: number;
                phaseAfter: "setup" | "deployment" | "combat" | "reinforcement" | "gameOver";
            } | {
                type: "attack";
                combat: {
                    turnNumber: number;
                    attackerPlayerIndex: number;
                    attackerCard: {
                        suit: "spades" | "hearts" | "diamonds" | "clubs";
                        rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                    };
                    targetColumn: number;
                    baseDamage: number;
                    steps: {
                        target: "frontCard" | "backCard" | "playerLp";
                        incomingDamage: number;
                        damage: number;
                        card?: {
                            suit: "spades" | "hearts" | "diamonds" | "clubs";
                            rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                        } | undefined;
                        hpBefore?: number | undefined;
                        effectiveHp?: number | undefined;
                        absorbed?: number | undefined;
                        overflow?: number | undefined;
                        hpAfter?: number | undefined;
                        destroyed?: boolean | undefined;
                        lpBefore?: number | undefined;
                        lpAfter?: number | undefined;
                        bonuses?: ("aceInvulnerable" | "aceVsAce" | "diamondDeathShield" | "clubDoubleOverflow" | "spadeDoubleLp" | "heartDeathShield")[] | undefined;
                    }[];
                    totalLpDamage: number;
                };
                reinforcementTriggered: boolean;
                victoryTriggered: boolean;
            } | {
                type: "pass";
            } | {
                type: "reinforce";
                column: number;
                gridIndex: number;
                cardsDrawn: number;
                reinforcementComplete: boolean;
            } | {
                type: "forfeit";
                winnerIndex: number;
            };
            sequenceNumber: number;
            action: {
                type: "deploy";
                card: {
                    suit: "spades" | "hearts" | "diamonds" | "clubs";
                    rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                };
                column: number;
                playerIndex: number;
            } | {
                type: "attack";
                playerIndex: number;
                attackerPosition: {
                    row: number;
                    col: number;
                };
                targetPosition: {
                    row: number;
                    col: number;
                };
            } | {
                type: "pass";
                playerIndex: number;
            } | {
                type: "reinforce";
                card: {
                    suit: "spades" | "hearts" | "diamonds" | "clubs";
                    rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                };
                playerIndex: number;
            } | {
                type: "forfeit";
                playerIndex: number;
            };
            stateHashBefore: string;
            stateHashAfter: string;
        }, {
            timestamp: string;
            details: {
                type: "deploy";
                gridIndex: number;
                phaseAfter: "setup" | "deployment" | "combat" | "reinforcement" | "gameOver";
            } | {
                type: "attack";
                combat: {
                    turnNumber: number;
                    attackerPlayerIndex: number;
                    attackerCard: {
                        suit: "spades" | "hearts" | "diamonds" | "clubs";
                        rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                    };
                    targetColumn: number;
                    baseDamage: number;
                    steps: {
                        target: "frontCard" | "backCard" | "playerLp";
                        incomingDamage: number;
                        damage: number;
                        card?: {
                            suit: "spades" | "hearts" | "diamonds" | "clubs";
                            rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                        } | undefined;
                        hpBefore?: number | undefined;
                        effectiveHp?: number | undefined;
                        absorbed?: number | undefined;
                        overflow?: number | undefined;
                        hpAfter?: number | undefined;
                        destroyed?: boolean | undefined;
                        lpBefore?: number | undefined;
                        lpAfter?: number | undefined;
                        bonuses?: ("aceInvulnerable" | "aceVsAce" | "diamondDeathShield" | "clubDoubleOverflow" | "spadeDoubleLp" | "heartDeathShield")[] | undefined;
                    }[];
                    totalLpDamage: number;
                };
                reinforcementTriggered: boolean;
                victoryTriggered: boolean;
            } | {
                type: "pass";
            } | {
                type: "reinforce";
                column: number;
                gridIndex: number;
                cardsDrawn: number;
                reinforcementComplete: boolean;
            } | {
                type: "forfeit";
                winnerIndex: number;
            };
            sequenceNumber: number;
            action: {
                type: "deploy";
                card: {
                    suit: "spades" | "hearts" | "diamonds" | "clubs";
                    rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                };
                column: number;
                playerIndex: number;
            } | {
                type: "attack";
                playerIndex: number;
                attackerPosition: {
                    row: number;
                    col: number;
                };
                targetPosition: {
                    row: number;
                    col: number;
                };
            } | {
                type: "pass";
                playerIndex: number;
            } | {
                type: "reinforce";
                card: {
                    suit: "spades" | "hearts" | "diamonds" | "clubs";
                    rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                };
                playerIndex: number;
            } | {
                type: "forfeit";
                playerIndex: number;
            };
            stateHashBefore: string;
            stateHashAfter: string;
        }>, "many">>;
        outcome: z.ZodOptional<z.ZodObject<{
            winnerIndex: z.ZodNumber;
            victoryType: z.ZodEnum<["lpDepletion", "cardDepletion", "forfeit"]>;
            turnNumber: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            turnNumber: number;
            winnerIndex: number;
            victoryType: "lpDepletion" | "cardDepletion" | "forfeit";
        }, {
            turnNumber: number;
            winnerIndex: number;
            victoryType: "lpDepletion" | "cardDepletion" | "forfeit";
        }>>;
        gameOptions: z.ZodOptional<z.ZodDefault<z.ZodObject<{
            damageMode: z.ZodDefault<z.ZodEnum<["cumulative", "per-turn"]>>;
        }, "strip", z.ZodTypeAny, {
            damageMode: "cumulative" | "per-turn";
        }, {
            damageMode?: "cumulative" | "per-turn" | undefined;
        }>>>;
    }, "strip", z.ZodTypeAny, {
        players: {
            player: {
                id: string;
                name: string;
            };
            hand: {
                suit: "spades" | "hearts" | "diamonds" | "clubs";
                rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
            }[];
            battlefield: ({
                card: {
                    suit: "spades" | "hearts" | "diamonds" | "clubs";
                    rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                };
                position: {
                    row: number;
                    col: number;
                };
                currentHp: number;
                faceDown: boolean;
            } | null)[];
            drawpile: {
                suit: "spades" | "hearts" | "diamonds" | "clubs";
                rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
            }[];
            discardPile: {
                suit: "spades" | "hearts" | "diamonds" | "clubs";
                rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
            }[];
            lifepoints: number;
            handCount?: number | undefined;
            drawpileCount?: number | undefined;
        }[];
        turnNumber: number;
        activePlayerIndex: number;
        phase: "setup" | "deployment" | "combat" | "reinforcement" | "gameOver";
        rngSeed: number;
        reinforcement?: {
            column: number;
            attackerIndex: number;
        } | undefined;
        deploymentOrder?: number[] | undefined;
        transactionLog?: {
            timestamp: string;
            details: {
                type: "deploy";
                gridIndex: number;
                phaseAfter: "setup" | "deployment" | "combat" | "reinforcement" | "gameOver";
            } | {
                type: "attack";
                combat: {
                    turnNumber: number;
                    attackerPlayerIndex: number;
                    attackerCard: {
                        suit: "spades" | "hearts" | "diamonds" | "clubs";
                        rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                    };
                    targetColumn: number;
                    baseDamage: number;
                    steps: {
                        target: "frontCard" | "backCard" | "playerLp";
                        incomingDamage: number;
                        damage: number;
                        card?: {
                            suit: "spades" | "hearts" | "diamonds" | "clubs";
                            rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                        } | undefined;
                        hpBefore?: number | undefined;
                        effectiveHp?: number | undefined;
                        absorbed?: number | undefined;
                        overflow?: number | undefined;
                        hpAfter?: number | undefined;
                        destroyed?: boolean | undefined;
                        lpBefore?: number | undefined;
                        lpAfter?: number | undefined;
                        bonuses?: ("aceInvulnerable" | "aceVsAce" | "diamondDeathShield" | "clubDoubleOverflow" | "spadeDoubleLp" | "heartDeathShield")[] | undefined;
                    }[];
                    totalLpDamage: number;
                };
                reinforcementTriggered: boolean;
                victoryTriggered: boolean;
            } | {
                type: "pass";
            } | {
                type: "reinforce";
                column: number;
                gridIndex: number;
                cardsDrawn: number;
                reinforcementComplete: boolean;
            } | {
                type: "forfeit";
                winnerIndex: number;
            };
            sequenceNumber: number;
            action: {
                type: "deploy";
                card: {
                    suit: "spades" | "hearts" | "diamonds" | "clubs";
                    rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                };
                column: number;
                playerIndex: number;
            } | {
                type: "attack";
                playerIndex: number;
                attackerPosition: {
                    row: number;
                    col: number;
                };
                targetPosition: {
                    row: number;
                    col: number;
                };
            } | {
                type: "pass";
                playerIndex: number;
            } | {
                type: "reinforce";
                card: {
                    suit: "spades" | "hearts" | "diamonds" | "clubs";
                    rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                };
                playerIndex: number;
            } | {
                type: "forfeit";
                playerIndex: number;
            };
            stateHashBefore: string;
            stateHashAfter: string;
        }[] | undefined;
        outcome?: {
            turnNumber: number;
            winnerIndex: number;
            victoryType: "lpDepletion" | "cardDepletion" | "forfeit";
        } | undefined;
        gameOptions?: {
            damageMode: "cumulative" | "per-turn";
        } | undefined;
    }, {
        players: {
            player: {
                id: string;
                name: string;
            };
            hand: {
                suit: "spades" | "hearts" | "diamonds" | "clubs";
                rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
            }[];
            battlefield: ({
                card: {
                    suit: "spades" | "hearts" | "diamonds" | "clubs";
                    rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                };
                position: {
                    row: number;
                    col: number;
                };
                currentHp: number;
                faceDown: boolean;
            } | null)[];
            drawpile: {
                suit: "spades" | "hearts" | "diamonds" | "clubs";
                rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
            }[];
            discardPile: {
                suit: "spades" | "hearts" | "diamonds" | "clubs";
                rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
            }[];
            lifepoints: number;
            handCount?: number | undefined;
            drawpileCount?: number | undefined;
        }[];
        turnNumber: number;
        activePlayerIndex: number;
        phase: "setup" | "deployment" | "combat" | "reinforcement" | "gameOver";
        rngSeed: number;
        reinforcement?: {
            column: number;
            attackerIndex: number;
        } | undefined;
        deploymentOrder?: number[] | undefined;
        transactionLog?: {
            timestamp: string;
            details: {
                type: "deploy";
                gridIndex: number;
                phaseAfter: "setup" | "deployment" | "combat" | "reinforcement" | "gameOver";
            } | {
                type: "attack";
                combat: {
                    turnNumber: number;
                    attackerPlayerIndex: number;
                    attackerCard: {
                        suit: "spades" | "hearts" | "diamonds" | "clubs";
                        rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                    };
                    targetColumn: number;
                    baseDamage: number;
                    steps: {
                        target: "frontCard" | "backCard" | "playerLp";
                        incomingDamage: number;
                        damage: number;
                        card?: {
                            suit: "spades" | "hearts" | "diamonds" | "clubs";
                            rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                        } | undefined;
                        hpBefore?: number | undefined;
                        effectiveHp?: number | undefined;
                        absorbed?: number | undefined;
                        overflow?: number | undefined;
                        hpAfter?: number | undefined;
                        destroyed?: boolean | undefined;
                        lpBefore?: number | undefined;
                        lpAfter?: number | undefined;
                        bonuses?: ("aceInvulnerable" | "aceVsAce" | "diamondDeathShield" | "clubDoubleOverflow" | "spadeDoubleLp" | "heartDeathShield")[] | undefined;
                    }[];
                    totalLpDamage: number;
                };
                reinforcementTriggered: boolean;
                victoryTriggered: boolean;
            } | {
                type: "pass";
            } | {
                type: "reinforce";
                column: number;
                gridIndex: number;
                cardsDrawn: number;
                reinforcementComplete: boolean;
            } | {
                type: "forfeit";
                winnerIndex: number;
            };
            sequenceNumber: number;
            action: {
                type: "deploy";
                card: {
                    suit: "spades" | "hearts" | "diamonds" | "clubs";
                    rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                };
                column: number;
                playerIndex: number;
            } | {
                type: "attack";
                playerIndex: number;
                attackerPosition: {
                    row: number;
                    col: number;
                };
                targetPosition: {
                    row: number;
                    col: number;
                };
            } | {
                type: "pass";
                playerIndex: number;
            } | {
                type: "reinforce";
                card: {
                    suit: "spades" | "hearts" | "diamonds" | "clubs";
                    rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                };
                playerIndex: number;
            } | {
                type: "forfeit";
                playerIndex: number;
            };
            stateHashBefore: string;
            stateHashAfter: string;
        }[] | undefined;
        outcome?: {
            turnNumber: number;
            winnerIndex: number;
            victoryType: "lpDepletion" | "cardDepletion" | "forfeit";
        } | undefined;
        gameOptions?: {
            damageMode?: "cumulative" | "per-turn" | undefined;
        } | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    ok: true;
    state: {
        players: {
            player: {
                id: string;
                name: string;
            };
            hand: {
                suit: "spades" | "hearts" | "diamonds" | "clubs";
                rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
            }[];
            battlefield: ({
                card: {
                    suit: "spades" | "hearts" | "diamonds" | "clubs";
                    rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                };
                position: {
                    row: number;
                    col: number;
                };
                currentHp: number;
                faceDown: boolean;
            } | null)[];
            drawpile: {
                suit: "spades" | "hearts" | "diamonds" | "clubs";
                rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
            }[];
            discardPile: {
                suit: "spades" | "hearts" | "diamonds" | "clubs";
                rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
            }[];
            lifepoints: number;
            handCount?: number | undefined;
            drawpileCount?: number | undefined;
        }[];
        turnNumber: number;
        activePlayerIndex: number;
        phase: "setup" | "deployment" | "combat" | "reinforcement" | "gameOver";
        rngSeed: number;
        reinforcement?: {
            column: number;
            attackerIndex: number;
        } | undefined;
        deploymentOrder?: number[] | undefined;
        transactionLog?: {
            timestamp: string;
            details: {
                type: "deploy";
                gridIndex: number;
                phaseAfter: "setup" | "deployment" | "combat" | "reinforcement" | "gameOver";
            } | {
                type: "attack";
                combat: {
                    turnNumber: number;
                    attackerPlayerIndex: number;
                    attackerCard: {
                        suit: "spades" | "hearts" | "diamonds" | "clubs";
                        rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                    };
                    targetColumn: number;
                    baseDamage: number;
                    steps: {
                        target: "frontCard" | "backCard" | "playerLp";
                        incomingDamage: number;
                        damage: number;
                        card?: {
                            suit: "spades" | "hearts" | "diamonds" | "clubs";
                            rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                        } | undefined;
                        hpBefore?: number | undefined;
                        effectiveHp?: number | undefined;
                        absorbed?: number | undefined;
                        overflow?: number | undefined;
                        hpAfter?: number | undefined;
                        destroyed?: boolean | undefined;
                        lpBefore?: number | undefined;
                        lpAfter?: number | undefined;
                        bonuses?: ("aceInvulnerable" | "aceVsAce" | "diamondDeathShield" | "clubDoubleOverflow" | "spadeDoubleLp" | "heartDeathShield")[] | undefined;
                    }[];
                    totalLpDamage: number;
                };
                reinforcementTriggered: boolean;
                victoryTriggered: boolean;
            } | {
                type: "pass";
            } | {
                type: "reinforce";
                column: number;
                gridIndex: number;
                cardsDrawn: number;
                reinforcementComplete: boolean;
            } | {
                type: "forfeit";
                winnerIndex: number;
            };
            sequenceNumber: number;
            action: {
                type: "deploy";
                card: {
                    suit: "spades" | "hearts" | "diamonds" | "clubs";
                    rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                };
                column: number;
                playerIndex: number;
            } | {
                type: "attack";
                playerIndex: number;
                attackerPosition: {
                    row: number;
                    col: number;
                };
                targetPosition: {
                    row: number;
                    col: number;
                };
            } | {
                type: "pass";
                playerIndex: number;
            } | {
                type: "reinforce";
                card: {
                    suit: "spades" | "hearts" | "diamonds" | "clubs";
                    rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                };
                playerIndex: number;
            } | {
                type: "forfeit";
                playerIndex: number;
            };
            stateHashBefore: string;
            stateHashAfter: string;
        }[] | undefined;
        outcome?: {
            turnNumber: number;
            winnerIndex: number;
            victoryType: "lpDepletion" | "cardDepletion" | "forfeit";
        } | undefined;
        gameOptions?: {
            damageMode: "cumulative" | "per-turn";
        } | undefined;
    };
}, {
    ok: true;
    state: {
        players: {
            player: {
                id: string;
                name: string;
            };
            hand: {
                suit: "spades" | "hearts" | "diamonds" | "clubs";
                rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
            }[];
            battlefield: ({
                card: {
                    suit: "spades" | "hearts" | "diamonds" | "clubs";
                    rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                };
                position: {
                    row: number;
                    col: number;
                };
                currentHp: number;
                faceDown: boolean;
            } | null)[];
            drawpile: {
                suit: "spades" | "hearts" | "diamonds" | "clubs";
                rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
            }[];
            discardPile: {
                suit: "spades" | "hearts" | "diamonds" | "clubs";
                rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
            }[];
            lifepoints: number;
            handCount?: number | undefined;
            drawpileCount?: number | undefined;
        }[];
        turnNumber: number;
        activePlayerIndex: number;
        phase: "setup" | "deployment" | "combat" | "reinforcement" | "gameOver";
        rngSeed: number;
        reinforcement?: {
            column: number;
            attackerIndex: number;
        } | undefined;
        deploymentOrder?: number[] | undefined;
        transactionLog?: {
            timestamp: string;
            details: {
                type: "deploy";
                gridIndex: number;
                phaseAfter: "setup" | "deployment" | "combat" | "reinforcement" | "gameOver";
            } | {
                type: "attack";
                combat: {
                    turnNumber: number;
                    attackerPlayerIndex: number;
                    attackerCard: {
                        suit: "spades" | "hearts" | "diamonds" | "clubs";
                        rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                    };
                    targetColumn: number;
                    baseDamage: number;
                    steps: {
                        target: "frontCard" | "backCard" | "playerLp";
                        incomingDamage: number;
                        damage: number;
                        card?: {
                            suit: "spades" | "hearts" | "diamonds" | "clubs";
                            rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                        } | undefined;
                        hpBefore?: number | undefined;
                        effectiveHp?: number | undefined;
                        absorbed?: number | undefined;
                        overflow?: number | undefined;
                        hpAfter?: number | undefined;
                        destroyed?: boolean | undefined;
                        lpBefore?: number | undefined;
                        lpAfter?: number | undefined;
                        bonuses?: ("aceInvulnerable" | "aceVsAce" | "diamondDeathShield" | "clubDoubleOverflow" | "spadeDoubleLp" | "heartDeathShield")[] | undefined;
                    }[];
                    totalLpDamage: number;
                };
                reinforcementTriggered: boolean;
                victoryTriggered: boolean;
            } | {
                type: "pass";
            } | {
                type: "reinforce";
                column: number;
                gridIndex: number;
                cardsDrawn: number;
                reinforcementComplete: boolean;
            } | {
                type: "forfeit";
                winnerIndex: number;
            };
            sequenceNumber: number;
            action: {
                type: "deploy";
                card: {
                    suit: "spades" | "hearts" | "diamonds" | "clubs";
                    rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                };
                column: number;
                playerIndex: number;
            } | {
                type: "attack";
                playerIndex: number;
                attackerPosition: {
                    row: number;
                    col: number;
                };
                targetPosition: {
                    row: number;
                    col: number;
                };
            } | {
                type: "pass";
                playerIndex: number;
            } | {
                type: "reinforce";
                card: {
                    suit: "spades" | "hearts" | "diamonds" | "clubs";
                    rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                };
                playerIndex: number;
            } | {
                type: "forfeit";
                playerIndex: number;
            };
            stateHashBefore: string;
            stateHashAfter: string;
        }[] | undefined;
        outcome?: {
            turnNumber: number;
            winnerIndex: number;
            victoryType: "lpDepletion" | "cardDepletion" | "forfeit";
        } | undefined;
        gameOptions?: {
            damageMode?: "cumulative" | "per-turn" | undefined;
        } | undefined;
    };
}>, z.ZodObject<{
    ok: z.ZodLiteral<false>;
    error: z.ZodString;
    code: z.ZodString;
}, "strip", z.ZodTypeAny, {
    code: string;
    error: string;
    ok: false;
}, {
    code: string;
    error: string;
    ok: false;
}>]>;
export declare const CreateMatchMessageSchema: z.ZodObject<{
    type: z.ZodLiteral<"createMatch">;
    playerName: z.ZodString;
    rngSeed: z.ZodOptional<z.ZodNumber>;
    gameOptions: z.ZodOptional<z.ZodObject<{
        damageMode: z.ZodDefault<z.ZodEnum<["cumulative", "per-turn"]>>;
        rngSeed: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        damageMode: "cumulative" | "per-turn";
        rngSeed?: number | undefined;
    }, {
        damageMode?: "cumulative" | "per-turn" | undefined;
        rngSeed?: number | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    type: "createMatch";
    playerName: string;
    rngSeed?: number | undefined;
    gameOptions?: {
        damageMode: "cumulative" | "per-turn";
        rngSeed?: number | undefined;
    } | undefined;
}, {
    type: "createMatch";
    playerName: string;
    rngSeed?: number | undefined;
    gameOptions?: {
        damageMode?: "cumulative" | "per-turn" | undefined;
        rngSeed?: number | undefined;
    } | undefined;
}>;
export declare const JoinMatchMessageSchema: z.ZodObject<{
    type: z.ZodLiteral<"joinMatch">;
    matchId: z.ZodString;
    playerName: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "joinMatch";
    matchId: string;
    playerName: string;
}, {
    type: "joinMatch";
    matchId: string;
    playerName: string;
}>;
export declare const PlayerActionMessageSchema: z.ZodObject<{
    type: z.ZodLiteral<"action">;
    matchId: z.ZodString;
    action: z.ZodDiscriminatedUnion<"type", [z.ZodObject<{
        type: z.ZodLiteral<"deploy">;
        playerIndex: z.ZodNumber;
        card: z.ZodObject<{
            suit: z.ZodEnum<["spades", "hearts", "diamonds", "clubs"]>;
            rank: z.ZodEnum<["A", "2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K"]>;
        }, "strip", z.ZodTypeAny, {
            suit: "spades" | "hearts" | "diamonds" | "clubs";
            rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
        }, {
            suit: "spades" | "hearts" | "diamonds" | "clubs";
            rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
        }>;
        column: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        type: "deploy";
        card: {
            suit: "spades" | "hearts" | "diamonds" | "clubs";
            rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
        };
        column: number;
        playerIndex: number;
    }, {
        type: "deploy";
        card: {
            suit: "spades" | "hearts" | "diamonds" | "clubs";
            rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
        };
        column: number;
        playerIndex: number;
    }>, z.ZodObject<{
        type: z.ZodLiteral<"attack">;
        playerIndex: z.ZodNumber;
        attackerPosition: z.ZodObject<{
            row: z.ZodNumber;
            col: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            row: number;
            col: number;
        }, {
            row: number;
            col: number;
        }>;
        targetPosition: z.ZodObject<{
            row: z.ZodNumber;
            col: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            row: number;
            col: number;
        }, {
            row: number;
            col: number;
        }>;
    }, "strip", z.ZodTypeAny, {
        type: "attack";
        playerIndex: number;
        attackerPosition: {
            row: number;
            col: number;
        };
        targetPosition: {
            row: number;
            col: number;
        };
    }, {
        type: "attack";
        playerIndex: number;
        attackerPosition: {
            row: number;
            col: number;
        };
        targetPosition: {
            row: number;
            col: number;
        };
    }>, z.ZodObject<{
        type: z.ZodLiteral<"pass">;
        playerIndex: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        type: "pass";
        playerIndex: number;
    }, {
        type: "pass";
        playerIndex: number;
    }>, z.ZodObject<{
        type: z.ZodLiteral<"reinforce">;
        playerIndex: z.ZodNumber;
        card: z.ZodObject<{
            suit: z.ZodEnum<["spades", "hearts", "diamonds", "clubs"]>;
            rank: z.ZodEnum<["A", "2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K"]>;
        }, "strip", z.ZodTypeAny, {
            suit: "spades" | "hearts" | "diamonds" | "clubs";
            rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
        }, {
            suit: "spades" | "hearts" | "diamonds" | "clubs";
            rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
        }>;
    }, "strip", z.ZodTypeAny, {
        type: "reinforce";
        card: {
            suit: "spades" | "hearts" | "diamonds" | "clubs";
            rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
        };
        playerIndex: number;
    }, {
        type: "reinforce";
        card: {
            suit: "spades" | "hearts" | "diamonds" | "clubs";
            rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
        };
        playerIndex: number;
    }>, z.ZodObject<{
        type: z.ZodLiteral<"forfeit">;
        playerIndex: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        type: "forfeit";
        playerIndex: number;
    }, {
        type: "forfeit";
        playerIndex: number;
    }>]>;
}, "strip", z.ZodTypeAny, {
    type: "action";
    matchId: string;
    action: {
        type: "deploy";
        card: {
            suit: "spades" | "hearts" | "diamonds" | "clubs";
            rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
        };
        column: number;
        playerIndex: number;
    } | {
        type: "attack";
        playerIndex: number;
        attackerPosition: {
            row: number;
            col: number;
        };
        targetPosition: {
            row: number;
            col: number;
        };
    } | {
        type: "pass";
        playerIndex: number;
    } | {
        type: "reinforce";
        card: {
            suit: "spades" | "hearts" | "diamonds" | "clubs";
            rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
        };
        playerIndex: number;
    } | {
        type: "forfeit";
        playerIndex: number;
    };
}, {
    type: "action";
    matchId: string;
    action: {
        type: "deploy";
        card: {
            suit: "spades" | "hearts" | "diamonds" | "clubs";
            rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
        };
        column: number;
        playerIndex: number;
    } | {
        type: "attack";
        playerIndex: number;
        attackerPosition: {
            row: number;
            col: number;
        };
        targetPosition: {
            row: number;
            col: number;
        };
    } | {
        type: "pass";
        playerIndex: number;
    } | {
        type: "reinforce";
        card: {
            suit: "spades" | "hearts" | "diamonds" | "clubs";
            rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
        };
        playerIndex: number;
    } | {
        type: "forfeit";
        playerIndex: number;
    };
}>;
export declare const WatchMatchMessageSchema: z.ZodObject<{
    type: z.ZodLiteral<"watchMatch">;
    matchId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "watchMatch";
    matchId: string;
}, {
    type: "watchMatch";
    matchId: string;
}>;
export declare const ClientMessageSchema: z.ZodDiscriminatedUnion<"type", [z.ZodObject<{
    type: z.ZodLiteral<"createMatch">;
    playerName: z.ZodString;
    rngSeed: z.ZodOptional<z.ZodNumber>;
    gameOptions: z.ZodOptional<z.ZodObject<{
        damageMode: z.ZodDefault<z.ZodEnum<["cumulative", "per-turn"]>>;
        rngSeed: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        damageMode: "cumulative" | "per-turn";
        rngSeed?: number | undefined;
    }, {
        damageMode?: "cumulative" | "per-turn" | undefined;
        rngSeed?: number | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    type: "createMatch";
    playerName: string;
    rngSeed?: number | undefined;
    gameOptions?: {
        damageMode: "cumulative" | "per-turn";
        rngSeed?: number | undefined;
    } | undefined;
}, {
    type: "createMatch";
    playerName: string;
    rngSeed?: number | undefined;
    gameOptions?: {
        damageMode?: "cumulative" | "per-turn" | undefined;
        rngSeed?: number | undefined;
    } | undefined;
}>, z.ZodObject<{
    type: z.ZodLiteral<"joinMatch">;
    matchId: z.ZodString;
    playerName: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "joinMatch";
    matchId: string;
    playerName: string;
}, {
    type: "joinMatch";
    matchId: string;
    playerName: string;
}>, z.ZodObject<{
    type: z.ZodLiteral<"action">;
    matchId: z.ZodString;
    action: z.ZodDiscriminatedUnion<"type", [z.ZodObject<{
        type: z.ZodLiteral<"deploy">;
        playerIndex: z.ZodNumber;
        card: z.ZodObject<{
            suit: z.ZodEnum<["spades", "hearts", "diamonds", "clubs"]>;
            rank: z.ZodEnum<["A", "2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K"]>;
        }, "strip", z.ZodTypeAny, {
            suit: "spades" | "hearts" | "diamonds" | "clubs";
            rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
        }, {
            suit: "spades" | "hearts" | "diamonds" | "clubs";
            rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
        }>;
        column: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        type: "deploy";
        card: {
            suit: "spades" | "hearts" | "diamonds" | "clubs";
            rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
        };
        column: number;
        playerIndex: number;
    }, {
        type: "deploy";
        card: {
            suit: "spades" | "hearts" | "diamonds" | "clubs";
            rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
        };
        column: number;
        playerIndex: number;
    }>, z.ZodObject<{
        type: z.ZodLiteral<"attack">;
        playerIndex: z.ZodNumber;
        attackerPosition: z.ZodObject<{
            row: z.ZodNumber;
            col: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            row: number;
            col: number;
        }, {
            row: number;
            col: number;
        }>;
        targetPosition: z.ZodObject<{
            row: z.ZodNumber;
            col: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            row: number;
            col: number;
        }, {
            row: number;
            col: number;
        }>;
    }, "strip", z.ZodTypeAny, {
        type: "attack";
        playerIndex: number;
        attackerPosition: {
            row: number;
            col: number;
        };
        targetPosition: {
            row: number;
            col: number;
        };
    }, {
        type: "attack";
        playerIndex: number;
        attackerPosition: {
            row: number;
            col: number;
        };
        targetPosition: {
            row: number;
            col: number;
        };
    }>, z.ZodObject<{
        type: z.ZodLiteral<"pass">;
        playerIndex: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        type: "pass";
        playerIndex: number;
    }, {
        type: "pass";
        playerIndex: number;
    }>, z.ZodObject<{
        type: z.ZodLiteral<"reinforce">;
        playerIndex: z.ZodNumber;
        card: z.ZodObject<{
            suit: z.ZodEnum<["spades", "hearts", "diamonds", "clubs"]>;
            rank: z.ZodEnum<["A", "2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K"]>;
        }, "strip", z.ZodTypeAny, {
            suit: "spades" | "hearts" | "diamonds" | "clubs";
            rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
        }, {
            suit: "spades" | "hearts" | "diamonds" | "clubs";
            rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
        }>;
    }, "strip", z.ZodTypeAny, {
        type: "reinforce";
        card: {
            suit: "spades" | "hearts" | "diamonds" | "clubs";
            rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
        };
        playerIndex: number;
    }, {
        type: "reinforce";
        card: {
            suit: "spades" | "hearts" | "diamonds" | "clubs";
            rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
        };
        playerIndex: number;
    }>, z.ZodObject<{
        type: z.ZodLiteral<"forfeit">;
        playerIndex: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        type: "forfeit";
        playerIndex: number;
    }, {
        type: "forfeit";
        playerIndex: number;
    }>]>;
}, "strip", z.ZodTypeAny, {
    type: "action";
    matchId: string;
    action: {
        type: "deploy";
        card: {
            suit: "spades" | "hearts" | "diamonds" | "clubs";
            rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
        };
        column: number;
        playerIndex: number;
    } | {
        type: "attack";
        playerIndex: number;
        attackerPosition: {
            row: number;
            col: number;
        };
        targetPosition: {
            row: number;
            col: number;
        };
    } | {
        type: "pass";
        playerIndex: number;
    } | {
        type: "reinforce";
        card: {
            suit: "spades" | "hearts" | "diamonds" | "clubs";
            rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
        };
        playerIndex: number;
    } | {
        type: "forfeit";
        playerIndex: number;
    };
}, {
    type: "action";
    matchId: string;
    action: {
        type: "deploy";
        card: {
            suit: "spades" | "hearts" | "diamonds" | "clubs";
            rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
        };
        column: number;
        playerIndex: number;
    } | {
        type: "attack";
        playerIndex: number;
        attackerPosition: {
            row: number;
            col: number;
        };
        targetPosition: {
            row: number;
            col: number;
        };
    } | {
        type: "pass";
        playerIndex: number;
    } | {
        type: "reinforce";
        card: {
            suit: "spades" | "hearts" | "diamonds" | "clubs";
            rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
        };
        playerIndex: number;
    } | {
        type: "forfeit";
        playerIndex: number;
    };
}>, z.ZodObject<{
    type: z.ZodLiteral<"watchMatch">;
    matchId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "watchMatch";
    matchId: string;
}, {
    type: "watchMatch";
    matchId: string;
}>]>;
export declare const MatchCreatedMessageSchema: z.ZodObject<{
    type: z.ZodLiteral<"matchCreated">;
    matchId: z.ZodString;
    playerId: z.ZodString;
    playerIndex: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    type: "matchCreated";
    matchId: string;
    playerId: string;
    playerIndex: number;
}, {
    type: "matchCreated";
    matchId: string;
    playerId: string;
    playerIndex: number;
}>;
export declare const MatchJoinedMessageSchema: z.ZodObject<{
    type: z.ZodLiteral<"matchJoined">;
    matchId: z.ZodString;
    playerId: z.ZodString;
    playerIndex: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    type: "matchJoined";
    matchId: string;
    playerId: string;
    playerIndex: number;
}, {
    type: "matchJoined";
    matchId: string;
    playerId: string;
    playerIndex: number;
}>;
export declare const GameStateMessageSchema: z.ZodObject<{
    type: z.ZodLiteral<"gameState">;
    matchId: z.ZodString;
    state: z.ZodObject<{
        players: z.ZodArray<z.ZodObject<{
            player: z.ZodObject<{
                id: z.ZodString;
                name: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                id: string;
                name: string;
            }, {
                id: string;
                name: string;
            }>;
            hand: z.ZodArray<z.ZodObject<{
                suit: z.ZodEnum<["spades", "hearts", "diamonds", "clubs"]>;
                rank: z.ZodEnum<["A", "2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K"]>;
            }, "strip", z.ZodTypeAny, {
                suit: "spades" | "hearts" | "diamonds" | "clubs";
                rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
            }, {
                suit: "spades" | "hearts" | "diamonds" | "clubs";
                rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
            }>, "many">;
            battlefield: z.ZodArray<z.ZodUnion<[z.ZodObject<{
                card: z.ZodObject<{
                    suit: z.ZodEnum<["spades", "hearts", "diamonds", "clubs"]>;
                    rank: z.ZodEnum<["A", "2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K"]>;
                }, "strip", z.ZodTypeAny, {
                    suit: "spades" | "hearts" | "diamonds" | "clubs";
                    rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                }, {
                    suit: "spades" | "hearts" | "diamonds" | "clubs";
                    rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                }>;
                position: z.ZodObject<{
                    row: z.ZodNumber;
                    col: z.ZodNumber;
                }, "strip", z.ZodTypeAny, {
                    row: number;
                    col: number;
                }, {
                    row: number;
                    col: number;
                }>;
                currentHp: z.ZodNumber;
                faceDown: z.ZodBoolean;
            }, "strip", z.ZodTypeAny, {
                card: {
                    suit: "spades" | "hearts" | "diamonds" | "clubs";
                    rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                };
                position: {
                    row: number;
                    col: number;
                };
                currentHp: number;
                faceDown: boolean;
            }, {
                card: {
                    suit: "spades" | "hearts" | "diamonds" | "clubs";
                    rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                };
                position: {
                    row: number;
                    col: number;
                };
                currentHp: number;
                faceDown: boolean;
            }>, z.ZodNull]>, "many">;
            drawpile: z.ZodArray<z.ZodObject<{
                suit: z.ZodEnum<["spades", "hearts", "diamonds", "clubs"]>;
                rank: z.ZodEnum<["A", "2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K"]>;
            }, "strip", z.ZodTypeAny, {
                suit: "spades" | "hearts" | "diamonds" | "clubs";
                rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
            }, {
                suit: "spades" | "hearts" | "diamonds" | "clubs";
                rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
            }>, "many">;
            discardPile: z.ZodArray<z.ZodObject<{
                suit: z.ZodEnum<["spades", "hearts", "diamonds", "clubs"]>;
                rank: z.ZodEnum<["A", "2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K"]>;
            }, "strip", z.ZodTypeAny, {
                suit: "spades" | "hearts" | "diamonds" | "clubs";
                rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
            }, {
                suit: "spades" | "hearts" | "diamonds" | "clubs";
                rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
            }>, "many">;
            lifepoints: z.ZodNumber;
            handCount: z.ZodOptional<z.ZodNumber>;
            drawpileCount: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            player: {
                id: string;
                name: string;
            };
            hand: {
                suit: "spades" | "hearts" | "diamonds" | "clubs";
                rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
            }[];
            battlefield: ({
                card: {
                    suit: "spades" | "hearts" | "diamonds" | "clubs";
                    rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                };
                position: {
                    row: number;
                    col: number;
                };
                currentHp: number;
                faceDown: boolean;
            } | null)[];
            drawpile: {
                suit: "spades" | "hearts" | "diamonds" | "clubs";
                rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
            }[];
            discardPile: {
                suit: "spades" | "hearts" | "diamonds" | "clubs";
                rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
            }[];
            lifepoints: number;
            handCount?: number | undefined;
            drawpileCount?: number | undefined;
        }, {
            player: {
                id: string;
                name: string;
            };
            hand: {
                suit: "spades" | "hearts" | "diamonds" | "clubs";
                rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
            }[];
            battlefield: ({
                card: {
                    suit: "spades" | "hearts" | "diamonds" | "clubs";
                    rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                };
                position: {
                    row: number;
                    col: number;
                };
                currentHp: number;
                faceDown: boolean;
            } | null)[];
            drawpile: {
                suit: "spades" | "hearts" | "diamonds" | "clubs";
                rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
            }[];
            discardPile: {
                suit: "spades" | "hearts" | "diamonds" | "clubs";
                rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
            }[];
            lifepoints: number;
            handCount?: number | undefined;
            drawpileCount?: number | undefined;
        }>, "many">;
        activePlayerIndex: z.ZodNumber;
        phase: z.ZodEnum<["setup", "deployment", "combat", "reinforcement", "gameOver"]>;
        turnNumber: z.ZodNumber;
        rngSeed: z.ZodNumber;
        deploymentOrder: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
        reinforcement: z.ZodOptional<z.ZodObject<{
            column: z.ZodNumber;
            attackerIndex: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            column: number;
            attackerIndex: number;
        }, {
            column: number;
            attackerIndex: number;
        }>>;
        transactionLog: z.ZodOptional<z.ZodArray<z.ZodObject<{
            sequenceNumber: z.ZodNumber;
            action: z.ZodDiscriminatedUnion<"type", [z.ZodObject<{
                type: z.ZodLiteral<"deploy">;
                playerIndex: z.ZodNumber;
                card: z.ZodObject<{
                    suit: z.ZodEnum<["spades", "hearts", "diamonds", "clubs"]>;
                    rank: z.ZodEnum<["A", "2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K"]>;
                }, "strip", z.ZodTypeAny, {
                    suit: "spades" | "hearts" | "diamonds" | "clubs";
                    rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                }, {
                    suit: "spades" | "hearts" | "diamonds" | "clubs";
                    rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                }>;
                column: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                type: "deploy";
                card: {
                    suit: "spades" | "hearts" | "diamonds" | "clubs";
                    rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                };
                column: number;
                playerIndex: number;
            }, {
                type: "deploy";
                card: {
                    suit: "spades" | "hearts" | "diamonds" | "clubs";
                    rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                };
                column: number;
                playerIndex: number;
            }>, z.ZodObject<{
                type: z.ZodLiteral<"attack">;
                playerIndex: z.ZodNumber;
                attackerPosition: z.ZodObject<{
                    row: z.ZodNumber;
                    col: z.ZodNumber;
                }, "strip", z.ZodTypeAny, {
                    row: number;
                    col: number;
                }, {
                    row: number;
                    col: number;
                }>;
                targetPosition: z.ZodObject<{
                    row: z.ZodNumber;
                    col: z.ZodNumber;
                }, "strip", z.ZodTypeAny, {
                    row: number;
                    col: number;
                }, {
                    row: number;
                    col: number;
                }>;
            }, "strip", z.ZodTypeAny, {
                type: "attack";
                playerIndex: number;
                attackerPosition: {
                    row: number;
                    col: number;
                };
                targetPosition: {
                    row: number;
                    col: number;
                };
            }, {
                type: "attack";
                playerIndex: number;
                attackerPosition: {
                    row: number;
                    col: number;
                };
                targetPosition: {
                    row: number;
                    col: number;
                };
            }>, z.ZodObject<{
                type: z.ZodLiteral<"pass">;
                playerIndex: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                type: "pass";
                playerIndex: number;
            }, {
                type: "pass";
                playerIndex: number;
            }>, z.ZodObject<{
                type: z.ZodLiteral<"reinforce">;
                playerIndex: z.ZodNumber;
                card: z.ZodObject<{
                    suit: z.ZodEnum<["spades", "hearts", "diamonds", "clubs"]>;
                    rank: z.ZodEnum<["A", "2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K"]>;
                }, "strip", z.ZodTypeAny, {
                    suit: "spades" | "hearts" | "diamonds" | "clubs";
                    rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                }, {
                    suit: "spades" | "hearts" | "diamonds" | "clubs";
                    rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                }>;
            }, "strip", z.ZodTypeAny, {
                type: "reinforce";
                card: {
                    suit: "spades" | "hearts" | "diamonds" | "clubs";
                    rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                };
                playerIndex: number;
            }, {
                type: "reinforce";
                card: {
                    suit: "spades" | "hearts" | "diamonds" | "clubs";
                    rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                };
                playerIndex: number;
            }>, z.ZodObject<{
                type: z.ZodLiteral<"forfeit">;
                playerIndex: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                type: "forfeit";
                playerIndex: number;
            }, {
                type: "forfeit";
                playerIndex: number;
            }>]>;
            stateHashBefore: z.ZodString;
            stateHashAfter: z.ZodString;
            timestamp: z.ZodString;
            details: z.ZodDiscriminatedUnion<"type", [z.ZodObject<{
                type: z.ZodLiteral<"deploy">;
                gridIndex: z.ZodNumber;
                phaseAfter: z.ZodEnum<["setup", "deployment", "combat", "reinforcement", "gameOver"]>;
            }, "strip", z.ZodTypeAny, {
                type: "deploy";
                gridIndex: number;
                phaseAfter: "setup" | "deployment" | "combat" | "reinforcement" | "gameOver";
            }, {
                type: "deploy";
                gridIndex: number;
                phaseAfter: "setup" | "deployment" | "combat" | "reinforcement" | "gameOver";
            }>, z.ZodObject<{
                type: z.ZodLiteral<"attack">;
                combat: z.ZodObject<{
                    turnNumber: z.ZodNumber;
                    attackerPlayerIndex: z.ZodNumber;
                    attackerCard: z.ZodObject<{
                        suit: z.ZodEnum<["spades", "hearts", "diamonds", "clubs"]>;
                        rank: z.ZodEnum<["A", "2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K"]>;
                    }, "strip", z.ZodTypeAny, {
                        suit: "spades" | "hearts" | "diamonds" | "clubs";
                        rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                    }, {
                        suit: "spades" | "hearts" | "diamonds" | "clubs";
                        rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                    }>;
                    targetColumn: z.ZodNumber;
                    baseDamage: z.ZodNumber;
                    steps: z.ZodArray<z.ZodObject<{
                        target: z.ZodEnum<["frontCard", "backCard", "playerLp"]>;
                        card: z.ZodOptional<z.ZodObject<{
                            suit: z.ZodEnum<["spades", "hearts", "diamonds", "clubs"]>;
                            rank: z.ZodEnum<["A", "2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K"]>;
                        }, "strip", z.ZodTypeAny, {
                            suit: "spades" | "hearts" | "diamonds" | "clubs";
                            rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                        }, {
                            suit: "spades" | "hearts" | "diamonds" | "clubs";
                            rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                        }>>;
                        incomingDamage: z.ZodNumber;
                        hpBefore: z.ZodOptional<z.ZodNumber>;
                        effectiveHp: z.ZodOptional<z.ZodNumber>;
                        absorbed: z.ZodOptional<z.ZodNumber>;
                        overflow: z.ZodOptional<z.ZodNumber>;
                        damage: z.ZodNumber;
                        hpAfter: z.ZodOptional<z.ZodNumber>;
                        destroyed: z.ZodOptional<z.ZodBoolean>;
                        lpBefore: z.ZodOptional<z.ZodNumber>;
                        lpAfter: z.ZodOptional<z.ZodNumber>;
                        bonuses: z.ZodOptional<z.ZodArray<z.ZodEnum<["aceInvulnerable", "aceVsAce", "diamondDeathShield", "clubDoubleOverflow", "spadeDoubleLp", "heartDeathShield"]>, "many">>;
                    }, "strip", z.ZodTypeAny, {
                        target: "frontCard" | "backCard" | "playerLp";
                        incomingDamage: number;
                        damage: number;
                        card?: {
                            suit: "spades" | "hearts" | "diamonds" | "clubs";
                            rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                        } | undefined;
                        hpBefore?: number | undefined;
                        effectiveHp?: number | undefined;
                        absorbed?: number | undefined;
                        overflow?: number | undefined;
                        hpAfter?: number | undefined;
                        destroyed?: boolean | undefined;
                        lpBefore?: number | undefined;
                        lpAfter?: number | undefined;
                        bonuses?: ("aceInvulnerable" | "aceVsAce" | "diamondDeathShield" | "clubDoubleOverflow" | "spadeDoubleLp" | "heartDeathShield")[] | undefined;
                    }, {
                        target: "frontCard" | "backCard" | "playerLp";
                        incomingDamage: number;
                        damage: number;
                        card?: {
                            suit: "spades" | "hearts" | "diamonds" | "clubs";
                            rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                        } | undefined;
                        hpBefore?: number | undefined;
                        effectiveHp?: number | undefined;
                        absorbed?: number | undefined;
                        overflow?: number | undefined;
                        hpAfter?: number | undefined;
                        destroyed?: boolean | undefined;
                        lpBefore?: number | undefined;
                        lpAfter?: number | undefined;
                        bonuses?: ("aceInvulnerable" | "aceVsAce" | "diamondDeathShield" | "clubDoubleOverflow" | "spadeDoubleLp" | "heartDeathShield")[] | undefined;
                    }>, "many">;
                    totalLpDamage: z.ZodNumber;
                }, "strip", z.ZodTypeAny, {
                    turnNumber: number;
                    attackerPlayerIndex: number;
                    attackerCard: {
                        suit: "spades" | "hearts" | "diamonds" | "clubs";
                        rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                    };
                    targetColumn: number;
                    baseDamage: number;
                    steps: {
                        target: "frontCard" | "backCard" | "playerLp";
                        incomingDamage: number;
                        damage: number;
                        card?: {
                            suit: "spades" | "hearts" | "diamonds" | "clubs";
                            rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                        } | undefined;
                        hpBefore?: number | undefined;
                        effectiveHp?: number | undefined;
                        absorbed?: number | undefined;
                        overflow?: number | undefined;
                        hpAfter?: number | undefined;
                        destroyed?: boolean | undefined;
                        lpBefore?: number | undefined;
                        lpAfter?: number | undefined;
                        bonuses?: ("aceInvulnerable" | "aceVsAce" | "diamondDeathShield" | "clubDoubleOverflow" | "spadeDoubleLp" | "heartDeathShield")[] | undefined;
                    }[];
                    totalLpDamage: number;
                }, {
                    turnNumber: number;
                    attackerPlayerIndex: number;
                    attackerCard: {
                        suit: "spades" | "hearts" | "diamonds" | "clubs";
                        rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                    };
                    targetColumn: number;
                    baseDamage: number;
                    steps: {
                        target: "frontCard" | "backCard" | "playerLp";
                        incomingDamage: number;
                        damage: number;
                        card?: {
                            suit: "spades" | "hearts" | "diamonds" | "clubs";
                            rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                        } | undefined;
                        hpBefore?: number | undefined;
                        effectiveHp?: number | undefined;
                        absorbed?: number | undefined;
                        overflow?: number | undefined;
                        hpAfter?: number | undefined;
                        destroyed?: boolean | undefined;
                        lpBefore?: number | undefined;
                        lpAfter?: number | undefined;
                        bonuses?: ("aceInvulnerable" | "aceVsAce" | "diamondDeathShield" | "clubDoubleOverflow" | "spadeDoubleLp" | "heartDeathShield")[] | undefined;
                    }[];
                    totalLpDamage: number;
                }>;
                reinforcementTriggered: z.ZodBoolean;
                victoryTriggered: z.ZodBoolean;
            }, "strip", z.ZodTypeAny, {
                type: "attack";
                combat: {
                    turnNumber: number;
                    attackerPlayerIndex: number;
                    attackerCard: {
                        suit: "spades" | "hearts" | "diamonds" | "clubs";
                        rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                    };
                    targetColumn: number;
                    baseDamage: number;
                    steps: {
                        target: "frontCard" | "backCard" | "playerLp";
                        incomingDamage: number;
                        damage: number;
                        card?: {
                            suit: "spades" | "hearts" | "diamonds" | "clubs";
                            rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                        } | undefined;
                        hpBefore?: number | undefined;
                        effectiveHp?: number | undefined;
                        absorbed?: number | undefined;
                        overflow?: number | undefined;
                        hpAfter?: number | undefined;
                        destroyed?: boolean | undefined;
                        lpBefore?: number | undefined;
                        lpAfter?: number | undefined;
                        bonuses?: ("aceInvulnerable" | "aceVsAce" | "diamondDeathShield" | "clubDoubleOverflow" | "spadeDoubleLp" | "heartDeathShield")[] | undefined;
                    }[];
                    totalLpDamage: number;
                };
                reinforcementTriggered: boolean;
                victoryTriggered: boolean;
            }, {
                type: "attack";
                combat: {
                    turnNumber: number;
                    attackerPlayerIndex: number;
                    attackerCard: {
                        suit: "spades" | "hearts" | "diamonds" | "clubs";
                        rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                    };
                    targetColumn: number;
                    baseDamage: number;
                    steps: {
                        target: "frontCard" | "backCard" | "playerLp";
                        incomingDamage: number;
                        damage: number;
                        card?: {
                            suit: "spades" | "hearts" | "diamonds" | "clubs";
                            rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                        } | undefined;
                        hpBefore?: number | undefined;
                        effectiveHp?: number | undefined;
                        absorbed?: number | undefined;
                        overflow?: number | undefined;
                        hpAfter?: number | undefined;
                        destroyed?: boolean | undefined;
                        lpBefore?: number | undefined;
                        lpAfter?: number | undefined;
                        bonuses?: ("aceInvulnerable" | "aceVsAce" | "diamondDeathShield" | "clubDoubleOverflow" | "spadeDoubleLp" | "heartDeathShield")[] | undefined;
                    }[];
                    totalLpDamage: number;
                };
                reinforcementTriggered: boolean;
                victoryTriggered: boolean;
            }>, z.ZodObject<{
                type: z.ZodLiteral<"pass">;
            }, "strip", z.ZodTypeAny, {
                type: "pass";
            }, {
                type: "pass";
            }>, z.ZodObject<{
                type: z.ZodLiteral<"reinforce">;
                column: z.ZodNumber;
                gridIndex: z.ZodNumber;
                cardsDrawn: z.ZodNumber;
                reinforcementComplete: z.ZodBoolean;
            }, "strip", z.ZodTypeAny, {
                type: "reinforce";
                column: number;
                gridIndex: number;
                cardsDrawn: number;
                reinforcementComplete: boolean;
            }, {
                type: "reinforce";
                column: number;
                gridIndex: number;
                cardsDrawn: number;
                reinforcementComplete: boolean;
            }>, z.ZodObject<{
                type: z.ZodLiteral<"forfeit">;
                winnerIndex: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                type: "forfeit";
                winnerIndex: number;
            }, {
                type: "forfeit";
                winnerIndex: number;
            }>]>;
        }, "strip", z.ZodTypeAny, {
            timestamp: string;
            details: {
                type: "deploy";
                gridIndex: number;
                phaseAfter: "setup" | "deployment" | "combat" | "reinforcement" | "gameOver";
            } | {
                type: "attack";
                combat: {
                    turnNumber: number;
                    attackerPlayerIndex: number;
                    attackerCard: {
                        suit: "spades" | "hearts" | "diamonds" | "clubs";
                        rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                    };
                    targetColumn: number;
                    baseDamage: number;
                    steps: {
                        target: "frontCard" | "backCard" | "playerLp";
                        incomingDamage: number;
                        damage: number;
                        card?: {
                            suit: "spades" | "hearts" | "diamonds" | "clubs";
                            rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                        } | undefined;
                        hpBefore?: number | undefined;
                        effectiveHp?: number | undefined;
                        absorbed?: number | undefined;
                        overflow?: number | undefined;
                        hpAfter?: number | undefined;
                        destroyed?: boolean | undefined;
                        lpBefore?: number | undefined;
                        lpAfter?: number | undefined;
                        bonuses?: ("aceInvulnerable" | "aceVsAce" | "diamondDeathShield" | "clubDoubleOverflow" | "spadeDoubleLp" | "heartDeathShield")[] | undefined;
                    }[];
                    totalLpDamage: number;
                };
                reinforcementTriggered: boolean;
                victoryTriggered: boolean;
            } | {
                type: "pass";
            } | {
                type: "reinforce";
                column: number;
                gridIndex: number;
                cardsDrawn: number;
                reinforcementComplete: boolean;
            } | {
                type: "forfeit";
                winnerIndex: number;
            };
            sequenceNumber: number;
            action: {
                type: "deploy";
                card: {
                    suit: "spades" | "hearts" | "diamonds" | "clubs";
                    rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                };
                column: number;
                playerIndex: number;
            } | {
                type: "attack";
                playerIndex: number;
                attackerPosition: {
                    row: number;
                    col: number;
                };
                targetPosition: {
                    row: number;
                    col: number;
                };
            } | {
                type: "pass";
                playerIndex: number;
            } | {
                type: "reinforce";
                card: {
                    suit: "spades" | "hearts" | "diamonds" | "clubs";
                    rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                };
                playerIndex: number;
            } | {
                type: "forfeit";
                playerIndex: number;
            };
            stateHashBefore: string;
            stateHashAfter: string;
        }, {
            timestamp: string;
            details: {
                type: "deploy";
                gridIndex: number;
                phaseAfter: "setup" | "deployment" | "combat" | "reinforcement" | "gameOver";
            } | {
                type: "attack";
                combat: {
                    turnNumber: number;
                    attackerPlayerIndex: number;
                    attackerCard: {
                        suit: "spades" | "hearts" | "diamonds" | "clubs";
                        rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                    };
                    targetColumn: number;
                    baseDamage: number;
                    steps: {
                        target: "frontCard" | "backCard" | "playerLp";
                        incomingDamage: number;
                        damage: number;
                        card?: {
                            suit: "spades" | "hearts" | "diamonds" | "clubs";
                            rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                        } | undefined;
                        hpBefore?: number | undefined;
                        effectiveHp?: number | undefined;
                        absorbed?: number | undefined;
                        overflow?: number | undefined;
                        hpAfter?: number | undefined;
                        destroyed?: boolean | undefined;
                        lpBefore?: number | undefined;
                        lpAfter?: number | undefined;
                        bonuses?: ("aceInvulnerable" | "aceVsAce" | "diamondDeathShield" | "clubDoubleOverflow" | "spadeDoubleLp" | "heartDeathShield")[] | undefined;
                    }[];
                    totalLpDamage: number;
                };
                reinforcementTriggered: boolean;
                victoryTriggered: boolean;
            } | {
                type: "pass";
            } | {
                type: "reinforce";
                column: number;
                gridIndex: number;
                cardsDrawn: number;
                reinforcementComplete: boolean;
            } | {
                type: "forfeit";
                winnerIndex: number;
            };
            sequenceNumber: number;
            action: {
                type: "deploy";
                card: {
                    suit: "spades" | "hearts" | "diamonds" | "clubs";
                    rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                };
                column: number;
                playerIndex: number;
            } | {
                type: "attack";
                playerIndex: number;
                attackerPosition: {
                    row: number;
                    col: number;
                };
                targetPosition: {
                    row: number;
                    col: number;
                };
            } | {
                type: "pass";
                playerIndex: number;
            } | {
                type: "reinforce";
                card: {
                    suit: "spades" | "hearts" | "diamonds" | "clubs";
                    rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                };
                playerIndex: number;
            } | {
                type: "forfeit";
                playerIndex: number;
            };
            stateHashBefore: string;
            stateHashAfter: string;
        }>, "many">>;
        outcome: z.ZodOptional<z.ZodObject<{
            winnerIndex: z.ZodNumber;
            victoryType: z.ZodEnum<["lpDepletion", "cardDepletion", "forfeit"]>;
            turnNumber: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            turnNumber: number;
            winnerIndex: number;
            victoryType: "lpDepletion" | "cardDepletion" | "forfeit";
        }, {
            turnNumber: number;
            winnerIndex: number;
            victoryType: "lpDepletion" | "cardDepletion" | "forfeit";
        }>>;
        gameOptions: z.ZodOptional<z.ZodDefault<z.ZodObject<{
            damageMode: z.ZodDefault<z.ZodEnum<["cumulative", "per-turn"]>>;
        }, "strip", z.ZodTypeAny, {
            damageMode: "cumulative" | "per-turn";
        }, {
            damageMode?: "cumulative" | "per-turn" | undefined;
        }>>>;
    }, "strip", z.ZodTypeAny, {
        players: {
            player: {
                id: string;
                name: string;
            };
            hand: {
                suit: "spades" | "hearts" | "diamonds" | "clubs";
                rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
            }[];
            battlefield: ({
                card: {
                    suit: "spades" | "hearts" | "diamonds" | "clubs";
                    rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                };
                position: {
                    row: number;
                    col: number;
                };
                currentHp: number;
                faceDown: boolean;
            } | null)[];
            drawpile: {
                suit: "spades" | "hearts" | "diamonds" | "clubs";
                rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
            }[];
            discardPile: {
                suit: "spades" | "hearts" | "diamonds" | "clubs";
                rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
            }[];
            lifepoints: number;
            handCount?: number | undefined;
            drawpileCount?: number | undefined;
        }[];
        turnNumber: number;
        activePlayerIndex: number;
        phase: "setup" | "deployment" | "combat" | "reinforcement" | "gameOver";
        rngSeed: number;
        reinforcement?: {
            column: number;
            attackerIndex: number;
        } | undefined;
        deploymentOrder?: number[] | undefined;
        transactionLog?: {
            timestamp: string;
            details: {
                type: "deploy";
                gridIndex: number;
                phaseAfter: "setup" | "deployment" | "combat" | "reinforcement" | "gameOver";
            } | {
                type: "attack";
                combat: {
                    turnNumber: number;
                    attackerPlayerIndex: number;
                    attackerCard: {
                        suit: "spades" | "hearts" | "diamonds" | "clubs";
                        rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                    };
                    targetColumn: number;
                    baseDamage: number;
                    steps: {
                        target: "frontCard" | "backCard" | "playerLp";
                        incomingDamage: number;
                        damage: number;
                        card?: {
                            suit: "spades" | "hearts" | "diamonds" | "clubs";
                            rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                        } | undefined;
                        hpBefore?: number | undefined;
                        effectiveHp?: number | undefined;
                        absorbed?: number | undefined;
                        overflow?: number | undefined;
                        hpAfter?: number | undefined;
                        destroyed?: boolean | undefined;
                        lpBefore?: number | undefined;
                        lpAfter?: number | undefined;
                        bonuses?: ("aceInvulnerable" | "aceVsAce" | "diamondDeathShield" | "clubDoubleOverflow" | "spadeDoubleLp" | "heartDeathShield")[] | undefined;
                    }[];
                    totalLpDamage: number;
                };
                reinforcementTriggered: boolean;
                victoryTriggered: boolean;
            } | {
                type: "pass";
            } | {
                type: "reinforce";
                column: number;
                gridIndex: number;
                cardsDrawn: number;
                reinforcementComplete: boolean;
            } | {
                type: "forfeit";
                winnerIndex: number;
            };
            sequenceNumber: number;
            action: {
                type: "deploy";
                card: {
                    suit: "spades" | "hearts" | "diamonds" | "clubs";
                    rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                };
                column: number;
                playerIndex: number;
            } | {
                type: "attack";
                playerIndex: number;
                attackerPosition: {
                    row: number;
                    col: number;
                };
                targetPosition: {
                    row: number;
                    col: number;
                };
            } | {
                type: "pass";
                playerIndex: number;
            } | {
                type: "reinforce";
                card: {
                    suit: "spades" | "hearts" | "diamonds" | "clubs";
                    rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                };
                playerIndex: number;
            } | {
                type: "forfeit";
                playerIndex: number;
            };
            stateHashBefore: string;
            stateHashAfter: string;
        }[] | undefined;
        outcome?: {
            turnNumber: number;
            winnerIndex: number;
            victoryType: "lpDepletion" | "cardDepletion" | "forfeit";
        } | undefined;
        gameOptions?: {
            damageMode: "cumulative" | "per-turn";
        } | undefined;
    }, {
        players: {
            player: {
                id: string;
                name: string;
            };
            hand: {
                suit: "spades" | "hearts" | "diamonds" | "clubs";
                rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
            }[];
            battlefield: ({
                card: {
                    suit: "spades" | "hearts" | "diamonds" | "clubs";
                    rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                };
                position: {
                    row: number;
                    col: number;
                };
                currentHp: number;
                faceDown: boolean;
            } | null)[];
            drawpile: {
                suit: "spades" | "hearts" | "diamonds" | "clubs";
                rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
            }[];
            discardPile: {
                suit: "spades" | "hearts" | "diamonds" | "clubs";
                rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
            }[];
            lifepoints: number;
            handCount?: number | undefined;
            drawpileCount?: number | undefined;
        }[];
        turnNumber: number;
        activePlayerIndex: number;
        phase: "setup" | "deployment" | "combat" | "reinforcement" | "gameOver";
        rngSeed: number;
        reinforcement?: {
            column: number;
            attackerIndex: number;
        } | undefined;
        deploymentOrder?: number[] | undefined;
        transactionLog?: {
            timestamp: string;
            details: {
                type: "deploy";
                gridIndex: number;
                phaseAfter: "setup" | "deployment" | "combat" | "reinforcement" | "gameOver";
            } | {
                type: "attack";
                combat: {
                    turnNumber: number;
                    attackerPlayerIndex: number;
                    attackerCard: {
                        suit: "spades" | "hearts" | "diamonds" | "clubs";
                        rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                    };
                    targetColumn: number;
                    baseDamage: number;
                    steps: {
                        target: "frontCard" | "backCard" | "playerLp";
                        incomingDamage: number;
                        damage: number;
                        card?: {
                            suit: "spades" | "hearts" | "diamonds" | "clubs";
                            rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                        } | undefined;
                        hpBefore?: number | undefined;
                        effectiveHp?: number | undefined;
                        absorbed?: number | undefined;
                        overflow?: number | undefined;
                        hpAfter?: number | undefined;
                        destroyed?: boolean | undefined;
                        lpBefore?: number | undefined;
                        lpAfter?: number | undefined;
                        bonuses?: ("aceInvulnerable" | "aceVsAce" | "diamondDeathShield" | "clubDoubleOverflow" | "spadeDoubleLp" | "heartDeathShield")[] | undefined;
                    }[];
                    totalLpDamage: number;
                };
                reinforcementTriggered: boolean;
                victoryTriggered: boolean;
            } | {
                type: "pass";
            } | {
                type: "reinforce";
                column: number;
                gridIndex: number;
                cardsDrawn: number;
                reinforcementComplete: boolean;
            } | {
                type: "forfeit";
                winnerIndex: number;
            };
            sequenceNumber: number;
            action: {
                type: "deploy";
                card: {
                    suit: "spades" | "hearts" | "diamonds" | "clubs";
                    rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                };
                column: number;
                playerIndex: number;
            } | {
                type: "attack";
                playerIndex: number;
                attackerPosition: {
                    row: number;
                    col: number;
                };
                targetPosition: {
                    row: number;
                    col: number;
                };
            } | {
                type: "pass";
                playerIndex: number;
            } | {
                type: "reinforce";
                card: {
                    suit: "spades" | "hearts" | "diamonds" | "clubs";
                    rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                };
                playerIndex: number;
            } | {
                type: "forfeit";
                playerIndex: number;
            };
            stateHashBefore: string;
            stateHashAfter: string;
        }[] | undefined;
        outcome?: {
            turnNumber: number;
            winnerIndex: number;
            victoryType: "lpDepletion" | "cardDepletion" | "forfeit";
        } | undefined;
        gameOptions?: {
            damageMode?: "cumulative" | "per-turn" | undefined;
        } | undefined;
    }>;
    spectatorCount: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    type: "gameState";
    matchId: string;
    state: {
        players: {
            player: {
                id: string;
                name: string;
            };
            hand: {
                suit: "spades" | "hearts" | "diamonds" | "clubs";
                rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
            }[];
            battlefield: ({
                card: {
                    suit: "spades" | "hearts" | "diamonds" | "clubs";
                    rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                };
                position: {
                    row: number;
                    col: number;
                };
                currentHp: number;
                faceDown: boolean;
            } | null)[];
            drawpile: {
                suit: "spades" | "hearts" | "diamonds" | "clubs";
                rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
            }[];
            discardPile: {
                suit: "spades" | "hearts" | "diamonds" | "clubs";
                rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
            }[];
            lifepoints: number;
            handCount?: number | undefined;
            drawpileCount?: number | undefined;
        }[];
        turnNumber: number;
        activePlayerIndex: number;
        phase: "setup" | "deployment" | "combat" | "reinforcement" | "gameOver";
        rngSeed: number;
        reinforcement?: {
            column: number;
            attackerIndex: number;
        } | undefined;
        deploymentOrder?: number[] | undefined;
        transactionLog?: {
            timestamp: string;
            details: {
                type: "deploy";
                gridIndex: number;
                phaseAfter: "setup" | "deployment" | "combat" | "reinforcement" | "gameOver";
            } | {
                type: "attack";
                combat: {
                    turnNumber: number;
                    attackerPlayerIndex: number;
                    attackerCard: {
                        suit: "spades" | "hearts" | "diamonds" | "clubs";
                        rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                    };
                    targetColumn: number;
                    baseDamage: number;
                    steps: {
                        target: "frontCard" | "backCard" | "playerLp";
                        incomingDamage: number;
                        damage: number;
                        card?: {
                            suit: "spades" | "hearts" | "diamonds" | "clubs";
                            rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                        } | undefined;
                        hpBefore?: number | undefined;
                        effectiveHp?: number | undefined;
                        absorbed?: number | undefined;
                        overflow?: number | undefined;
                        hpAfter?: number | undefined;
                        destroyed?: boolean | undefined;
                        lpBefore?: number | undefined;
                        lpAfter?: number | undefined;
                        bonuses?: ("aceInvulnerable" | "aceVsAce" | "diamondDeathShield" | "clubDoubleOverflow" | "spadeDoubleLp" | "heartDeathShield")[] | undefined;
                    }[];
                    totalLpDamage: number;
                };
                reinforcementTriggered: boolean;
                victoryTriggered: boolean;
            } | {
                type: "pass";
            } | {
                type: "reinforce";
                column: number;
                gridIndex: number;
                cardsDrawn: number;
                reinforcementComplete: boolean;
            } | {
                type: "forfeit";
                winnerIndex: number;
            };
            sequenceNumber: number;
            action: {
                type: "deploy";
                card: {
                    suit: "spades" | "hearts" | "diamonds" | "clubs";
                    rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                };
                column: number;
                playerIndex: number;
            } | {
                type: "attack";
                playerIndex: number;
                attackerPosition: {
                    row: number;
                    col: number;
                };
                targetPosition: {
                    row: number;
                    col: number;
                };
            } | {
                type: "pass";
                playerIndex: number;
            } | {
                type: "reinforce";
                card: {
                    suit: "spades" | "hearts" | "diamonds" | "clubs";
                    rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                };
                playerIndex: number;
            } | {
                type: "forfeit";
                playerIndex: number;
            };
            stateHashBefore: string;
            stateHashAfter: string;
        }[] | undefined;
        outcome?: {
            turnNumber: number;
            winnerIndex: number;
            victoryType: "lpDepletion" | "cardDepletion" | "forfeit";
        } | undefined;
        gameOptions?: {
            damageMode: "cumulative" | "per-turn";
        } | undefined;
    };
    spectatorCount?: number | undefined;
}, {
    type: "gameState";
    matchId: string;
    state: {
        players: {
            player: {
                id: string;
                name: string;
            };
            hand: {
                suit: "spades" | "hearts" | "diamonds" | "clubs";
                rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
            }[];
            battlefield: ({
                card: {
                    suit: "spades" | "hearts" | "diamonds" | "clubs";
                    rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                };
                position: {
                    row: number;
                    col: number;
                };
                currentHp: number;
                faceDown: boolean;
            } | null)[];
            drawpile: {
                suit: "spades" | "hearts" | "diamonds" | "clubs";
                rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
            }[];
            discardPile: {
                suit: "spades" | "hearts" | "diamonds" | "clubs";
                rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
            }[];
            lifepoints: number;
            handCount?: number | undefined;
            drawpileCount?: number | undefined;
        }[];
        turnNumber: number;
        activePlayerIndex: number;
        phase: "setup" | "deployment" | "combat" | "reinforcement" | "gameOver";
        rngSeed: number;
        reinforcement?: {
            column: number;
            attackerIndex: number;
        } | undefined;
        deploymentOrder?: number[] | undefined;
        transactionLog?: {
            timestamp: string;
            details: {
                type: "deploy";
                gridIndex: number;
                phaseAfter: "setup" | "deployment" | "combat" | "reinforcement" | "gameOver";
            } | {
                type: "attack";
                combat: {
                    turnNumber: number;
                    attackerPlayerIndex: number;
                    attackerCard: {
                        suit: "spades" | "hearts" | "diamonds" | "clubs";
                        rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                    };
                    targetColumn: number;
                    baseDamage: number;
                    steps: {
                        target: "frontCard" | "backCard" | "playerLp";
                        incomingDamage: number;
                        damage: number;
                        card?: {
                            suit: "spades" | "hearts" | "diamonds" | "clubs";
                            rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                        } | undefined;
                        hpBefore?: number | undefined;
                        effectiveHp?: number | undefined;
                        absorbed?: number | undefined;
                        overflow?: number | undefined;
                        hpAfter?: number | undefined;
                        destroyed?: boolean | undefined;
                        lpBefore?: number | undefined;
                        lpAfter?: number | undefined;
                        bonuses?: ("aceInvulnerable" | "aceVsAce" | "diamondDeathShield" | "clubDoubleOverflow" | "spadeDoubleLp" | "heartDeathShield")[] | undefined;
                    }[];
                    totalLpDamage: number;
                };
                reinforcementTriggered: boolean;
                victoryTriggered: boolean;
            } | {
                type: "pass";
            } | {
                type: "reinforce";
                column: number;
                gridIndex: number;
                cardsDrawn: number;
                reinforcementComplete: boolean;
            } | {
                type: "forfeit";
                winnerIndex: number;
            };
            sequenceNumber: number;
            action: {
                type: "deploy";
                card: {
                    suit: "spades" | "hearts" | "diamonds" | "clubs";
                    rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                };
                column: number;
                playerIndex: number;
            } | {
                type: "attack";
                playerIndex: number;
                attackerPosition: {
                    row: number;
                    col: number;
                };
                targetPosition: {
                    row: number;
                    col: number;
                };
            } | {
                type: "pass";
                playerIndex: number;
            } | {
                type: "reinforce";
                card: {
                    suit: "spades" | "hearts" | "diamonds" | "clubs";
                    rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                };
                playerIndex: number;
            } | {
                type: "forfeit";
                playerIndex: number;
            };
            stateHashBefore: string;
            stateHashAfter: string;
        }[] | undefined;
        outcome?: {
            turnNumber: number;
            winnerIndex: number;
            victoryType: "lpDepletion" | "cardDepletion" | "forfeit";
        } | undefined;
        gameOptions?: {
            damageMode?: "cumulative" | "per-turn" | undefined;
        } | undefined;
    };
    spectatorCount?: number | undefined;
}>;
export declare const ActionErrorMessageSchema: z.ZodObject<{
    type: z.ZodLiteral<"actionError">;
    matchId: z.ZodString;
    error: z.ZodString;
    code: z.ZodString;
}, "strip", z.ZodTypeAny, {
    code: string;
    type: "actionError";
    matchId: string;
    error: string;
}, {
    code: string;
    type: "actionError";
    matchId: string;
    error: string;
}>;
export declare const MatchErrorMessageSchema: z.ZodObject<{
    type: z.ZodLiteral<"matchError">;
    error: z.ZodString;
    code: z.ZodString;
}, "strip", z.ZodTypeAny, {
    code: string;
    type: "matchError";
    error: string;
}, {
    code: string;
    type: "matchError";
    error: string;
}>;
export declare const OpponentDisconnectedMessageSchema: z.ZodObject<{
    type: z.ZodLiteral<"opponentDisconnected">;
    matchId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "opponentDisconnected";
    matchId: string;
}, {
    type: "opponentDisconnected";
    matchId: string;
}>;
export declare const OpponentReconnectedMessageSchema: z.ZodObject<{
    type: z.ZodLiteral<"opponentReconnected">;
    matchId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "opponentReconnected";
    matchId: string;
}, {
    type: "opponentReconnected";
    matchId: string;
}>;
export declare const SpectatorJoinedMessageSchema: z.ZodObject<{
    type: z.ZodLiteral<"spectatorJoined">;
    matchId: z.ZodString;
    spectatorId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "spectatorJoined";
    matchId: string;
    spectatorId: string;
}, {
    type: "spectatorJoined";
    matchId: string;
    spectatorId: string;
}>;
export declare const ServerMessageSchema: z.ZodDiscriminatedUnion<"type", [z.ZodObject<{
    type: z.ZodLiteral<"matchCreated">;
    matchId: z.ZodString;
    playerId: z.ZodString;
    playerIndex: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    type: "matchCreated";
    matchId: string;
    playerId: string;
    playerIndex: number;
}, {
    type: "matchCreated";
    matchId: string;
    playerId: string;
    playerIndex: number;
}>, z.ZodObject<{
    type: z.ZodLiteral<"matchJoined">;
    matchId: z.ZodString;
    playerId: z.ZodString;
    playerIndex: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    type: "matchJoined";
    matchId: string;
    playerId: string;
    playerIndex: number;
}, {
    type: "matchJoined";
    matchId: string;
    playerId: string;
    playerIndex: number;
}>, z.ZodObject<{
    type: z.ZodLiteral<"gameState">;
    matchId: z.ZodString;
    state: z.ZodObject<{
        players: z.ZodArray<z.ZodObject<{
            player: z.ZodObject<{
                id: z.ZodString;
                name: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                id: string;
                name: string;
            }, {
                id: string;
                name: string;
            }>;
            hand: z.ZodArray<z.ZodObject<{
                suit: z.ZodEnum<["spades", "hearts", "diamonds", "clubs"]>;
                rank: z.ZodEnum<["A", "2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K"]>;
            }, "strip", z.ZodTypeAny, {
                suit: "spades" | "hearts" | "diamonds" | "clubs";
                rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
            }, {
                suit: "spades" | "hearts" | "diamonds" | "clubs";
                rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
            }>, "many">;
            battlefield: z.ZodArray<z.ZodUnion<[z.ZodObject<{
                card: z.ZodObject<{
                    suit: z.ZodEnum<["spades", "hearts", "diamonds", "clubs"]>;
                    rank: z.ZodEnum<["A", "2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K"]>;
                }, "strip", z.ZodTypeAny, {
                    suit: "spades" | "hearts" | "diamonds" | "clubs";
                    rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                }, {
                    suit: "spades" | "hearts" | "diamonds" | "clubs";
                    rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                }>;
                position: z.ZodObject<{
                    row: z.ZodNumber;
                    col: z.ZodNumber;
                }, "strip", z.ZodTypeAny, {
                    row: number;
                    col: number;
                }, {
                    row: number;
                    col: number;
                }>;
                currentHp: z.ZodNumber;
                faceDown: z.ZodBoolean;
            }, "strip", z.ZodTypeAny, {
                card: {
                    suit: "spades" | "hearts" | "diamonds" | "clubs";
                    rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                };
                position: {
                    row: number;
                    col: number;
                };
                currentHp: number;
                faceDown: boolean;
            }, {
                card: {
                    suit: "spades" | "hearts" | "diamonds" | "clubs";
                    rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                };
                position: {
                    row: number;
                    col: number;
                };
                currentHp: number;
                faceDown: boolean;
            }>, z.ZodNull]>, "many">;
            drawpile: z.ZodArray<z.ZodObject<{
                suit: z.ZodEnum<["spades", "hearts", "diamonds", "clubs"]>;
                rank: z.ZodEnum<["A", "2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K"]>;
            }, "strip", z.ZodTypeAny, {
                suit: "spades" | "hearts" | "diamonds" | "clubs";
                rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
            }, {
                suit: "spades" | "hearts" | "diamonds" | "clubs";
                rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
            }>, "many">;
            discardPile: z.ZodArray<z.ZodObject<{
                suit: z.ZodEnum<["spades", "hearts", "diamonds", "clubs"]>;
                rank: z.ZodEnum<["A", "2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K"]>;
            }, "strip", z.ZodTypeAny, {
                suit: "spades" | "hearts" | "diamonds" | "clubs";
                rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
            }, {
                suit: "spades" | "hearts" | "diamonds" | "clubs";
                rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
            }>, "many">;
            lifepoints: z.ZodNumber;
            handCount: z.ZodOptional<z.ZodNumber>;
            drawpileCount: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            player: {
                id: string;
                name: string;
            };
            hand: {
                suit: "spades" | "hearts" | "diamonds" | "clubs";
                rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
            }[];
            battlefield: ({
                card: {
                    suit: "spades" | "hearts" | "diamonds" | "clubs";
                    rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                };
                position: {
                    row: number;
                    col: number;
                };
                currentHp: number;
                faceDown: boolean;
            } | null)[];
            drawpile: {
                suit: "spades" | "hearts" | "diamonds" | "clubs";
                rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
            }[];
            discardPile: {
                suit: "spades" | "hearts" | "diamonds" | "clubs";
                rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
            }[];
            lifepoints: number;
            handCount?: number | undefined;
            drawpileCount?: number | undefined;
        }, {
            player: {
                id: string;
                name: string;
            };
            hand: {
                suit: "spades" | "hearts" | "diamonds" | "clubs";
                rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
            }[];
            battlefield: ({
                card: {
                    suit: "spades" | "hearts" | "diamonds" | "clubs";
                    rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                };
                position: {
                    row: number;
                    col: number;
                };
                currentHp: number;
                faceDown: boolean;
            } | null)[];
            drawpile: {
                suit: "spades" | "hearts" | "diamonds" | "clubs";
                rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
            }[];
            discardPile: {
                suit: "spades" | "hearts" | "diamonds" | "clubs";
                rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
            }[];
            lifepoints: number;
            handCount?: number | undefined;
            drawpileCount?: number | undefined;
        }>, "many">;
        activePlayerIndex: z.ZodNumber;
        phase: z.ZodEnum<["setup", "deployment", "combat", "reinforcement", "gameOver"]>;
        turnNumber: z.ZodNumber;
        rngSeed: z.ZodNumber;
        deploymentOrder: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
        reinforcement: z.ZodOptional<z.ZodObject<{
            column: z.ZodNumber;
            attackerIndex: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            column: number;
            attackerIndex: number;
        }, {
            column: number;
            attackerIndex: number;
        }>>;
        transactionLog: z.ZodOptional<z.ZodArray<z.ZodObject<{
            sequenceNumber: z.ZodNumber;
            action: z.ZodDiscriminatedUnion<"type", [z.ZodObject<{
                type: z.ZodLiteral<"deploy">;
                playerIndex: z.ZodNumber;
                card: z.ZodObject<{
                    suit: z.ZodEnum<["spades", "hearts", "diamonds", "clubs"]>;
                    rank: z.ZodEnum<["A", "2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K"]>;
                }, "strip", z.ZodTypeAny, {
                    suit: "spades" | "hearts" | "diamonds" | "clubs";
                    rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                }, {
                    suit: "spades" | "hearts" | "diamonds" | "clubs";
                    rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                }>;
                column: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                type: "deploy";
                card: {
                    suit: "spades" | "hearts" | "diamonds" | "clubs";
                    rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                };
                column: number;
                playerIndex: number;
            }, {
                type: "deploy";
                card: {
                    suit: "spades" | "hearts" | "diamonds" | "clubs";
                    rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                };
                column: number;
                playerIndex: number;
            }>, z.ZodObject<{
                type: z.ZodLiteral<"attack">;
                playerIndex: z.ZodNumber;
                attackerPosition: z.ZodObject<{
                    row: z.ZodNumber;
                    col: z.ZodNumber;
                }, "strip", z.ZodTypeAny, {
                    row: number;
                    col: number;
                }, {
                    row: number;
                    col: number;
                }>;
                targetPosition: z.ZodObject<{
                    row: z.ZodNumber;
                    col: z.ZodNumber;
                }, "strip", z.ZodTypeAny, {
                    row: number;
                    col: number;
                }, {
                    row: number;
                    col: number;
                }>;
            }, "strip", z.ZodTypeAny, {
                type: "attack";
                playerIndex: number;
                attackerPosition: {
                    row: number;
                    col: number;
                };
                targetPosition: {
                    row: number;
                    col: number;
                };
            }, {
                type: "attack";
                playerIndex: number;
                attackerPosition: {
                    row: number;
                    col: number;
                };
                targetPosition: {
                    row: number;
                    col: number;
                };
            }>, z.ZodObject<{
                type: z.ZodLiteral<"pass">;
                playerIndex: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                type: "pass";
                playerIndex: number;
            }, {
                type: "pass";
                playerIndex: number;
            }>, z.ZodObject<{
                type: z.ZodLiteral<"reinforce">;
                playerIndex: z.ZodNumber;
                card: z.ZodObject<{
                    suit: z.ZodEnum<["spades", "hearts", "diamonds", "clubs"]>;
                    rank: z.ZodEnum<["A", "2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K"]>;
                }, "strip", z.ZodTypeAny, {
                    suit: "spades" | "hearts" | "diamonds" | "clubs";
                    rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                }, {
                    suit: "spades" | "hearts" | "diamonds" | "clubs";
                    rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                }>;
            }, "strip", z.ZodTypeAny, {
                type: "reinforce";
                card: {
                    suit: "spades" | "hearts" | "diamonds" | "clubs";
                    rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                };
                playerIndex: number;
            }, {
                type: "reinforce";
                card: {
                    suit: "spades" | "hearts" | "diamonds" | "clubs";
                    rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                };
                playerIndex: number;
            }>, z.ZodObject<{
                type: z.ZodLiteral<"forfeit">;
                playerIndex: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                type: "forfeit";
                playerIndex: number;
            }, {
                type: "forfeit";
                playerIndex: number;
            }>]>;
            stateHashBefore: z.ZodString;
            stateHashAfter: z.ZodString;
            timestamp: z.ZodString;
            details: z.ZodDiscriminatedUnion<"type", [z.ZodObject<{
                type: z.ZodLiteral<"deploy">;
                gridIndex: z.ZodNumber;
                phaseAfter: z.ZodEnum<["setup", "deployment", "combat", "reinforcement", "gameOver"]>;
            }, "strip", z.ZodTypeAny, {
                type: "deploy";
                gridIndex: number;
                phaseAfter: "setup" | "deployment" | "combat" | "reinforcement" | "gameOver";
            }, {
                type: "deploy";
                gridIndex: number;
                phaseAfter: "setup" | "deployment" | "combat" | "reinforcement" | "gameOver";
            }>, z.ZodObject<{
                type: z.ZodLiteral<"attack">;
                combat: z.ZodObject<{
                    turnNumber: z.ZodNumber;
                    attackerPlayerIndex: z.ZodNumber;
                    attackerCard: z.ZodObject<{
                        suit: z.ZodEnum<["spades", "hearts", "diamonds", "clubs"]>;
                        rank: z.ZodEnum<["A", "2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K"]>;
                    }, "strip", z.ZodTypeAny, {
                        suit: "spades" | "hearts" | "diamonds" | "clubs";
                        rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                    }, {
                        suit: "spades" | "hearts" | "diamonds" | "clubs";
                        rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                    }>;
                    targetColumn: z.ZodNumber;
                    baseDamage: z.ZodNumber;
                    steps: z.ZodArray<z.ZodObject<{
                        target: z.ZodEnum<["frontCard", "backCard", "playerLp"]>;
                        card: z.ZodOptional<z.ZodObject<{
                            suit: z.ZodEnum<["spades", "hearts", "diamonds", "clubs"]>;
                            rank: z.ZodEnum<["A", "2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K"]>;
                        }, "strip", z.ZodTypeAny, {
                            suit: "spades" | "hearts" | "diamonds" | "clubs";
                            rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                        }, {
                            suit: "spades" | "hearts" | "diamonds" | "clubs";
                            rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                        }>>;
                        incomingDamage: z.ZodNumber;
                        hpBefore: z.ZodOptional<z.ZodNumber>;
                        effectiveHp: z.ZodOptional<z.ZodNumber>;
                        absorbed: z.ZodOptional<z.ZodNumber>;
                        overflow: z.ZodOptional<z.ZodNumber>;
                        damage: z.ZodNumber;
                        hpAfter: z.ZodOptional<z.ZodNumber>;
                        destroyed: z.ZodOptional<z.ZodBoolean>;
                        lpBefore: z.ZodOptional<z.ZodNumber>;
                        lpAfter: z.ZodOptional<z.ZodNumber>;
                        bonuses: z.ZodOptional<z.ZodArray<z.ZodEnum<["aceInvulnerable", "aceVsAce", "diamondDeathShield", "clubDoubleOverflow", "spadeDoubleLp", "heartDeathShield"]>, "many">>;
                    }, "strip", z.ZodTypeAny, {
                        target: "frontCard" | "backCard" | "playerLp";
                        incomingDamage: number;
                        damage: number;
                        card?: {
                            suit: "spades" | "hearts" | "diamonds" | "clubs";
                            rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                        } | undefined;
                        hpBefore?: number | undefined;
                        effectiveHp?: number | undefined;
                        absorbed?: number | undefined;
                        overflow?: number | undefined;
                        hpAfter?: number | undefined;
                        destroyed?: boolean | undefined;
                        lpBefore?: number | undefined;
                        lpAfter?: number | undefined;
                        bonuses?: ("aceInvulnerable" | "aceVsAce" | "diamondDeathShield" | "clubDoubleOverflow" | "spadeDoubleLp" | "heartDeathShield")[] | undefined;
                    }, {
                        target: "frontCard" | "backCard" | "playerLp";
                        incomingDamage: number;
                        damage: number;
                        card?: {
                            suit: "spades" | "hearts" | "diamonds" | "clubs";
                            rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                        } | undefined;
                        hpBefore?: number | undefined;
                        effectiveHp?: number | undefined;
                        absorbed?: number | undefined;
                        overflow?: number | undefined;
                        hpAfter?: number | undefined;
                        destroyed?: boolean | undefined;
                        lpBefore?: number | undefined;
                        lpAfter?: number | undefined;
                        bonuses?: ("aceInvulnerable" | "aceVsAce" | "diamondDeathShield" | "clubDoubleOverflow" | "spadeDoubleLp" | "heartDeathShield")[] | undefined;
                    }>, "many">;
                    totalLpDamage: z.ZodNumber;
                }, "strip", z.ZodTypeAny, {
                    turnNumber: number;
                    attackerPlayerIndex: number;
                    attackerCard: {
                        suit: "spades" | "hearts" | "diamonds" | "clubs";
                        rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                    };
                    targetColumn: number;
                    baseDamage: number;
                    steps: {
                        target: "frontCard" | "backCard" | "playerLp";
                        incomingDamage: number;
                        damage: number;
                        card?: {
                            suit: "spades" | "hearts" | "diamonds" | "clubs";
                            rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                        } | undefined;
                        hpBefore?: number | undefined;
                        effectiveHp?: number | undefined;
                        absorbed?: number | undefined;
                        overflow?: number | undefined;
                        hpAfter?: number | undefined;
                        destroyed?: boolean | undefined;
                        lpBefore?: number | undefined;
                        lpAfter?: number | undefined;
                        bonuses?: ("aceInvulnerable" | "aceVsAce" | "diamondDeathShield" | "clubDoubleOverflow" | "spadeDoubleLp" | "heartDeathShield")[] | undefined;
                    }[];
                    totalLpDamage: number;
                }, {
                    turnNumber: number;
                    attackerPlayerIndex: number;
                    attackerCard: {
                        suit: "spades" | "hearts" | "diamonds" | "clubs";
                        rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                    };
                    targetColumn: number;
                    baseDamage: number;
                    steps: {
                        target: "frontCard" | "backCard" | "playerLp";
                        incomingDamage: number;
                        damage: number;
                        card?: {
                            suit: "spades" | "hearts" | "diamonds" | "clubs";
                            rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                        } | undefined;
                        hpBefore?: number | undefined;
                        effectiveHp?: number | undefined;
                        absorbed?: number | undefined;
                        overflow?: number | undefined;
                        hpAfter?: number | undefined;
                        destroyed?: boolean | undefined;
                        lpBefore?: number | undefined;
                        lpAfter?: number | undefined;
                        bonuses?: ("aceInvulnerable" | "aceVsAce" | "diamondDeathShield" | "clubDoubleOverflow" | "spadeDoubleLp" | "heartDeathShield")[] | undefined;
                    }[];
                    totalLpDamage: number;
                }>;
                reinforcementTriggered: z.ZodBoolean;
                victoryTriggered: z.ZodBoolean;
            }, "strip", z.ZodTypeAny, {
                type: "attack";
                combat: {
                    turnNumber: number;
                    attackerPlayerIndex: number;
                    attackerCard: {
                        suit: "spades" | "hearts" | "diamonds" | "clubs";
                        rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                    };
                    targetColumn: number;
                    baseDamage: number;
                    steps: {
                        target: "frontCard" | "backCard" | "playerLp";
                        incomingDamage: number;
                        damage: number;
                        card?: {
                            suit: "spades" | "hearts" | "diamonds" | "clubs";
                            rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                        } | undefined;
                        hpBefore?: number | undefined;
                        effectiveHp?: number | undefined;
                        absorbed?: number | undefined;
                        overflow?: number | undefined;
                        hpAfter?: number | undefined;
                        destroyed?: boolean | undefined;
                        lpBefore?: number | undefined;
                        lpAfter?: number | undefined;
                        bonuses?: ("aceInvulnerable" | "aceVsAce" | "diamondDeathShield" | "clubDoubleOverflow" | "spadeDoubleLp" | "heartDeathShield")[] | undefined;
                    }[];
                    totalLpDamage: number;
                };
                reinforcementTriggered: boolean;
                victoryTriggered: boolean;
            }, {
                type: "attack";
                combat: {
                    turnNumber: number;
                    attackerPlayerIndex: number;
                    attackerCard: {
                        suit: "spades" | "hearts" | "diamonds" | "clubs";
                        rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                    };
                    targetColumn: number;
                    baseDamage: number;
                    steps: {
                        target: "frontCard" | "backCard" | "playerLp";
                        incomingDamage: number;
                        damage: number;
                        card?: {
                            suit: "spades" | "hearts" | "diamonds" | "clubs";
                            rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                        } | undefined;
                        hpBefore?: number | undefined;
                        effectiveHp?: number | undefined;
                        absorbed?: number | undefined;
                        overflow?: number | undefined;
                        hpAfter?: number | undefined;
                        destroyed?: boolean | undefined;
                        lpBefore?: number | undefined;
                        lpAfter?: number | undefined;
                        bonuses?: ("aceInvulnerable" | "aceVsAce" | "diamondDeathShield" | "clubDoubleOverflow" | "spadeDoubleLp" | "heartDeathShield")[] | undefined;
                    }[];
                    totalLpDamage: number;
                };
                reinforcementTriggered: boolean;
                victoryTriggered: boolean;
            }>, z.ZodObject<{
                type: z.ZodLiteral<"pass">;
            }, "strip", z.ZodTypeAny, {
                type: "pass";
            }, {
                type: "pass";
            }>, z.ZodObject<{
                type: z.ZodLiteral<"reinforce">;
                column: z.ZodNumber;
                gridIndex: z.ZodNumber;
                cardsDrawn: z.ZodNumber;
                reinforcementComplete: z.ZodBoolean;
            }, "strip", z.ZodTypeAny, {
                type: "reinforce";
                column: number;
                gridIndex: number;
                cardsDrawn: number;
                reinforcementComplete: boolean;
            }, {
                type: "reinforce";
                column: number;
                gridIndex: number;
                cardsDrawn: number;
                reinforcementComplete: boolean;
            }>, z.ZodObject<{
                type: z.ZodLiteral<"forfeit">;
                winnerIndex: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                type: "forfeit";
                winnerIndex: number;
            }, {
                type: "forfeit";
                winnerIndex: number;
            }>]>;
        }, "strip", z.ZodTypeAny, {
            timestamp: string;
            details: {
                type: "deploy";
                gridIndex: number;
                phaseAfter: "setup" | "deployment" | "combat" | "reinforcement" | "gameOver";
            } | {
                type: "attack";
                combat: {
                    turnNumber: number;
                    attackerPlayerIndex: number;
                    attackerCard: {
                        suit: "spades" | "hearts" | "diamonds" | "clubs";
                        rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                    };
                    targetColumn: number;
                    baseDamage: number;
                    steps: {
                        target: "frontCard" | "backCard" | "playerLp";
                        incomingDamage: number;
                        damage: number;
                        card?: {
                            suit: "spades" | "hearts" | "diamonds" | "clubs";
                            rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                        } | undefined;
                        hpBefore?: number | undefined;
                        effectiveHp?: number | undefined;
                        absorbed?: number | undefined;
                        overflow?: number | undefined;
                        hpAfter?: number | undefined;
                        destroyed?: boolean | undefined;
                        lpBefore?: number | undefined;
                        lpAfter?: number | undefined;
                        bonuses?: ("aceInvulnerable" | "aceVsAce" | "diamondDeathShield" | "clubDoubleOverflow" | "spadeDoubleLp" | "heartDeathShield")[] | undefined;
                    }[];
                    totalLpDamage: number;
                };
                reinforcementTriggered: boolean;
                victoryTriggered: boolean;
            } | {
                type: "pass";
            } | {
                type: "reinforce";
                column: number;
                gridIndex: number;
                cardsDrawn: number;
                reinforcementComplete: boolean;
            } | {
                type: "forfeit";
                winnerIndex: number;
            };
            sequenceNumber: number;
            action: {
                type: "deploy";
                card: {
                    suit: "spades" | "hearts" | "diamonds" | "clubs";
                    rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                };
                column: number;
                playerIndex: number;
            } | {
                type: "attack";
                playerIndex: number;
                attackerPosition: {
                    row: number;
                    col: number;
                };
                targetPosition: {
                    row: number;
                    col: number;
                };
            } | {
                type: "pass";
                playerIndex: number;
            } | {
                type: "reinforce";
                card: {
                    suit: "spades" | "hearts" | "diamonds" | "clubs";
                    rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                };
                playerIndex: number;
            } | {
                type: "forfeit";
                playerIndex: number;
            };
            stateHashBefore: string;
            stateHashAfter: string;
        }, {
            timestamp: string;
            details: {
                type: "deploy";
                gridIndex: number;
                phaseAfter: "setup" | "deployment" | "combat" | "reinforcement" | "gameOver";
            } | {
                type: "attack";
                combat: {
                    turnNumber: number;
                    attackerPlayerIndex: number;
                    attackerCard: {
                        suit: "spades" | "hearts" | "diamonds" | "clubs";
                        rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                    };
                    targetColumn: number;
                    baseDamage: number;
                    steps: {
                        target: "frontCard" | "backCard" | "playerLp";
                        incomingDamage: number;
                        damage: number;
                        card?: {
                            suit: "spades" | "hearts" | "diamonds" | "clubs";
                            rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                        } | undefined;
                        hpBefore?: number | undefined;
                        effectiveHp?: number | undefined;
                        absorbed?: number | undefined;
                        overflow?: number | undefined;
                        hpAfter?: number | undefined;
                        destroyed?: boolean | undefined;
                        lpBefore?: number | undefined;
                        lpAfter?: number | undefined;
                        bonuses?: ("aceInvulnerable" | "aceVsAce" | "diamondDeathShield" | "clubDoubleOverflow" | "spadeDoubleLp" | "heartDeathShield")[] | undefined;
                    }[];
                    totalLpDamage: number;
                };
                reinforcementTriggered: boolean;
                victoryTriggered: boolean;
            } | {
                type: "pass";
            } | {
                type: "reinforce";
                column: number;
                gridIndex: number;
                cardsDrawn: number;
                reinforcementComplete: boolean;
            } | {
                type: "forfeit";
                winnerIndex: number;
            };
            sequenceNumber: number;
            action: {
                type: "deploy";
                card: {
                    suit: "spades" | "hearts" | "diamonds" | "clubs";
                    rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                };
                column: number;
                playerIndex: number;
            } | {
                type: "attack";
                playerIndex: number;
                attackerPosition: {
                    row: number;
                    col: number;
                };
                targetPosition: {
                    row: number;
                    col: number;
                };
            } | {
                type: "pass";
                playerIndex: number;
            } | {
                type: "reinforce";
                card: {
                    suit: "spades" | "hearts" | "diamonds" | "clubs";
                    rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                };
                playerIndex: number;
            } | {
                type: "forfeit";
                playerIndex: number;
            };
            stateHashBefore: string;
            stateHashAfter: string;
        }>, "many">>;
        outcome: z.ZodOptional<z.ZodObject<{
            winnerIndex: z.ZodNumber;
            victoryType: z.ZodEnum<["lpDepletion", "cardDepletion", "forfeit"]>;
            turnNumber: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            turnNumber: number;
            winnerIndex: number;
            victoryType: "lpDepletion" | "cardDepletion" | "forfeit";
        }, {
            turnNumber: number;
            winnerIndex: number;
            victoryType: "lpDepletion" | "cardDepletion" | "forfeit";
        }>>;
        gameOptions: z.ZodOptional<z.ZodDefault<z.ZodObject<{
            damageMode: z.ZodDefault<z.ZodEnum<["cumulative", "per-turn"]>>;
        }, "strip", z.ZodTypeAny, {
            damageMode: "cumulative" | "per-turn";
        }, {
            damageMode?: "cumulative" | "per-turn" | undefined;
        }>>>;
    }, "strip", z.ZodTypeAny, {
        players: {
            player: {
                id: string;
                name: string;
            };
            hand: {
                suit: "spades" | "hearts" | "diamonds" | "clubs";
                rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
            }[];
            battlefield: ({
                card: {
                    suit: "spades" | "hearts" | "diamonds" | "clubs";
                    rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                };
                position: {
                    row: number;
                    col: number;
                };
                currentHp: number;
                faceDown: boolean;
            } | null)[];
            drawpile: {
                suit: "spades" | "hearts" | "diamonds" | "clubs";
                rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
            }[];
            discardPile: {
                suit: "spades" | "hearts" | "diamonds" | "clubs";
                rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
            }[];
            lifepoints: number;
            handCount?: number | undefined;
            drawpileCount?: number | undefined;
        }[];
        turnNumber: number;
        activePlayerIndex: number;
        phase: "setup" | "deployment" | "combat" | "reinforcement" | "gameOver";
        rngSeed: number;
        reinforcement?: {
            column: number;
            attackerIndex: number;
        } | undefined;
        deploymentOrder?: number[] | undefined;
        transactionLog?: {
            timestamp: string;
            details: {
                type: "deploy";
                gridIndex: number;
                phaseAfter: "setup" | "deployment" | "combat" | "reinforcement" | "gameOver";
            } | {
                type: "attack";
                combat: {
                    turnNumber: number;
                    attackerPlayerIndex: number;
                    attackerCard: {
                        suit: "spades" | "hearts" | "diamonds" | "clubs";
                        rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                    };
                    targetColumn: number;
                    baseDamage: number;
                    steps: {
                        target: "frontCard" | "backCard" | "playerLp";
                        incomingDamage: number;
                        damage: number;
                        card?: {
                            suit: "spades" | "hearts" | "diamonds" | "clubs";
                            rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                        } | undefined;
                        hpBefore?: number | undefined;
                        effectiveHp?: number | undefined;
                        absorbed?: number | undefined;
                        overflow?: number | undefined;
                        hpAfter?: number | undefined;
                        destroyed?: boolean | undefined;
                        lpBefore?: number | undefined;
                        lpAfter?: number | undefined;
                        bonuses?: ("aceInvulnerable" | "aceVsAce" | "diamondDeathShield" | "clubDoubleOverflow" | "spadeDoubleLp" | "heartDeathShield")[] | undefined;
                    }[];
                    totalLpDamage: number;
                };
                reinforcementTriggered: boolean;
                victoryTriggered: boolean;
            } | {
                type: "pass";
            } | {
                type: "reinforce";
                column: number;
                gridIndex: number;
                cardsDrawn: number;
                reinforcementComplete: boolean;
            } | {
                type: "forfeit";
                winnerIndex: number;
            };
            sequenceNumber: number;
            action: {
                type: "deploy";
                card: {
                    suit: "spades" | "hearts" | "diamonds" | "clubs";
                    rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                };
                column: number;
                playerIndex: number;
            } | {
                type: "attack";
                playerIndex: number;
                attackerPosition: {
                    row: number;
                    col: number;
                };
                targetPosition: {
                    row: number;
                    col: number;
                };
            } | {
                type: "pass";
                playerIndex: number;
            } | {
                type: "reinforce";
                card: {
                    suit: "spades" | "hearts" | "diamonds" | "clubs";
                    rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                };
                playerIndex: number;
            } | {
                type: "forfeit";
                playerIndex: number;
            };
            stateHashBefore: string;
            stateHashAfter: string;
        }[] | undefined;
        outcome?: {
            turnNumber: number;
            winnerIndex: number;
            victoryType: "lpDepletion" | "cardDepletion" | "forfeit";
        } | undefined;
        gameOptions?: {
            damageMode: "cumulative" | "per-turn";
        } | undefined;
    }, {
        players: {
            player: {
                id: string;
                name: string;
            };
            hand: {
                suit: "spades" | "hearts" | "diamonds" | "clubs";
                rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
            }[];
            battlefield: ({
                card: {
                    suit: "spades" | "hearts" | "diamonds" | "clubs";
                    rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                };
                position: {
                    row: number;
                    col: number;
                };
                currentHp: number;
                faceDown: boolean;
            } | null)[];
            drawpile: {
                suit: "spades" | "hearts" | "diamonds" | "clubs";
                rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
            }[];
            discardPile: {
                suit: "spades" | "hearts" | "diamonds" | "clubs";
                rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
            }[];
            lifepoints: number;
            handCount?: number | undefined;
            drawpileCount?: number | undefined;
        }[];
        turnNumber: number;
        activePlayerIndex: number;
        phase: "setup" | "deployment" | "combat" | "reinforcement" | "gameOver";
        rngSeed: number;
        reinforcement?: {
            column: number;
            attackerIndex: number;
        } | undefined;
        deploymentOrder?: number[] | undefined;
        transactionLog?: {
            timestamp: string;
            details: {
                type: "deploy";
                gridIndex: number;
                phaseAfter: "setup" | "deployment" | "combat" | "reinforcement" | "gameOver";
            } | {
                type: "attack";
                combat: {
                    turnNumber: number;
                    attackerPlayerIndex: number;
                    attackerCard: {
                        suit: "spades" | "hearts" | "diamonds" | "clubs";
                        rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                    };
                    targetColumn: number;
                    baseDamage: number;
                    steps: {
                        target: "frontCard" | "backCard" | "playerLp";
                        incomingDamage: number;
                        damage: number;
                        card?: {
                            suit: "spades" | "hearts" | "diamonds" | "clubs";
                            rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                        } | undefined;
                        hpBefore?: number | undefined;
                        effectiveHp?: number | undefined;
                        absorbed?: number | undefined;
                        overflow?: number | undefined;
                        hpAfter?: number | undefined;
                        destroyed?: boolean | undefined;
                        lpBefore?: number | undefined;
                        lpAfter?: number | undefined;
                        bonuses?: ("aceInvulnerable" | "aceVsAce" | "diamondDeathShield" | "clubDoubleOverflow" | "spadeDoubleLp" | "heartDeathShield")[] | undefined;
                    }[];
                    totalLpDamage: number;
                };
                reinforcementTriggered: boolean;
                victoryTriggered: boolean;
            } | {
                type: "pass";
            } | {
                type: "reinforce";
                column: number;
                gridIndex: number;
                cardsDrawn: number;
                reinforcementComplete: boolean;
            } | {
                type: "forfeit";
                winnerIndex: number;
            };
            sequenceNumber: number;
            action: {
                type: "deploy";
                card: {
                    suit: "spades" | "hearts" | "diamonds" | "clubs";
                    rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                };
                column: number;
                playerIndex: number;
            } | {
                type: "attack";
                playerIndex: number;
                attackerPosition: {
                    row: number;
                    col: number;
                };
                targetPosition: {
                    row: number;
                    col: number;
                };
            } | {
                type: "pass";
                playerIndex: number;
            } | {
                type: "reinforce";
                card: {
                    suit: "spades" | "hearts" | "diamonds" | "clubs";
                    rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                };
                playerIndex: number;
            } | {
                type: "forfeit";
                playerIndex: number;
            };
            stateHashBefore: string;
            stateHashAfter: string;
        }[] | undefined;
        outcome?: {
            turnNumber: number;
            winnerIndex: number;
            victoryType: "lpDepletion" | "cardDepletion" | "forfeit";
        } | undefined;
        gameOptions?: {
            damageMode?: "cumulative" | "per-turn" | undefined;
        } | undefined;
    }>;
    spectatorCount: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    type: "gameState";
    matchId: string;
    state: {
        players: {
            player: {
                id: string;
                name: string;
            };
            hand: {
                suit: "spades" | "hearts" | "diamonds" | "clubs";
                rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
            }[];
            battlefield: ({
                card: {
                    suit: "spades" | "hearts" | "diamonds" | "clubs";
                    rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                };
                position: {
                    row: number;
                    col: number;
                };
                currentHp: number;
                faceDown: boolean;
            } | null)[];
            drawpile: {
                suit: "spades" | "hearts" | "diamonds" | "clubs";
                rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
            }[];
            discardPile: {
                suit: "spades" | "hearts" | "diamonds" | "clubs";
                rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
            }[];
            lifepoints: number;
            handCount?: number | undefined;
            drawpileCount?: number | undefined;
        }[];
        turnNumber: number;
        activePlayerIndex: number;
        phase: "setup" | "deployment" | "combat" | "reinforcement" | "gameOver";
        rngSeed: number;
        reinforcement?: {
            column: number;
            attackerIndex: number;
        } | undefined;
        deploymentOrder?: number[] | undefined;
        transactionLog?: {
            timestamp: string;
            details: {
                type: "deploy";
                gridIndex: number;
                phaseAfter: "setup" | "deployment" | "combat" | "reinforcement" | "gameOver";
            } | {
                type: "attack";
                combat: {
                    turnNumber: number;
                    attackerPlayerIndex: number;
                    attackerCard: {
                        suit: "spades" | "hearts" | "diamonds" | "clubs";
                        rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                    };
                    targetColumn: number;
                    baseDamage: number;
                    steps: {
                        target: "frontCard" | "backCard" | "playerLp";
                        incomingDamage: number;
                        damage: number;
                        card?: {
                            suit: "spades" | "hearts" | "diamonds" | "clubs";
                            rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                        } | undefined;
                        hpBefore?: number | undefined;
                        effectiveHp?: number | undefined;
                        absorbed?: number | undefined;
                        overflow?: number | undefined;
                        hpAfter?: number | undefined;
                        destroyed?: boolean | undefined;
                        lpBefore?: number | undefined;
                        lpAfter?: number | undefined;
                        bonuses?: ("aceInvulnerable" | "aceVsAce" | "diamondDeathShield" | "clubDoubleOverflow" | "spadeDoubleLp" | "heartDeathShield")[] | undefined;
                    }[];
                    totalLpDamage: number;
                };
                reinforcementTriggered: boolean;
                victoryTriggered: boolean;
            } | {
                type: "pass";
            } | {
                type: "reinforce";
                column: number;
                gridIndex: number;
                cardsDrawn: number;
                reinforcementComplete: boolean;
            } | {
                type: "forfeit";
                winnerIndex: number;
            };
            sequenceNumber: number;
            action: {
                type: "deploy";
                card: {
                    suit: "spades" | "hearts" | "diamonds" | "clubs";
                    rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                };
                column: number;
                playerIndex: number;
            } | {
                type: "attack";
                playerIndex: number;
                attackerPosition: {
                    row: number;
                    col: number;
                };
                targetPosition: {
                    row: number;
                    col: number;
                };
            } | {
                type: "pass";
                playerIndex: number;
            } | {
                type: "reinforce";
                card: {
                    suit: "spades" | "hearts" | "diamonds" | "clubs";
                    rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                };
                playerIndex: number;
            } | {
                type: "forfeit";
                playerIndex: number;
            };
            stateHashBefore: string;
            stateHashAfter: string;
        }[] | undefined;
        outcome?: {
            turnNumber: number;
            winnerIndex: number;
            victoryType: "lpDepletion" | "cardDepletion" | "forfeit";
        } | undefined;
        gameOptions?: {
            damageMode: "cumulative" | "per-turn";
        } | undefined;
    };
    spectatorCount?: number | undefined;
}, {
    type: "gameState";
    matchId: string;
    state: {
        players: {
            player: {
                id: string;
                name: string;
            };
            hand: {
                suit: "spades" | "hearts" | "diamonds" | "clubs";
                rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
            }[];
            battlefield: ({
                card: {
                    suit: "spades" | "hearts" | "diamonds" | "clubs";
                    rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                };
                position: {
                    row: number;
                    col: number;
                };
                currentHp: number;
                faceDown: boolean;
            } | null)[];
            drawpile: {
                suit: "spades" | "hearts" | "diamonds" | "clubs";
                rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
            }[];
            discardPile: {
                suit: "spades" | "hearts" | "diamonds" | "clubs";
                rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
            }[];
            lifepoints: number;
            handCount?: number | undefined;
            drawpileCount?: number | undefined;
        }[];
        turnNumber: number;
        activePlayerIndex: number;
        phase: "setup" | "deployment" | "combat" | "reinforcement" | "gameOver";
        rngSeed: number;
        reinforcement?: {
            column: number;
            attackerIndex: number;
        } | undefined;
        deploymentOrder?: number[] | undefined;
        transactionLog?: {
            timestamp: string;
            details: {
                type: "deploy";
                gridIndex: number;
                phaseAfter: "setup" | "deployment" | "combat" | "reinforcement" | "gameOver";
            } | {
                type: "attack";
                combat: {
                    turnNumber: number;
                    attackerPlayerIndex: number;
                    attackerCard: {
                        suit: "spades" | "hearts" | "diamonds" | "clubs";
                        rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                    };
                    targetColumn: number;
                    baseDamage: number;
                    steps: {
                        target: "frontCard" | "backCard" | "playerLp";
                        incomingDamage: number;
                        damage: number;
                        card?: {
                            suit: "spades" | "hearts" | "diamonds" | "clubs";
                            rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                        } | undefined;
                        hpBefore?: number | undefined;
                        effectiveHp?: number | undefined;
                        absorbed?: number | undefined;
                        overflow?: number | undefined;
                        hpAfter?: number | undefined;
                        destroyed?: boolean | undefined;
                        lpBefore?: number | undefined;
                        lpAfter?: number | undefined;
                        bonuses?: ("aceInvulnerable" | "aceVsAce" | "diamondDeathShield" | "clubDoubleOverflow" | "spadeDoubleLp" | "heartDeathShield")[] | undefined;
                    }[];
                    totalLpDamage: number;
                };
                reinforcementTriggered: boolean;
                victoryTriggered: boolean;
            } | {
                type: "pass";
            } | {
                type: "reinforce";
                column: number;
                gridIndex: number;
                cardsDrawn: number;
                reinforcementComplete: boolean;
            } | {
                type: "forfeit";
                winnerIndex: number;
            };
            sequenceNumber: number;
            action: {
                type: "deploy";
                card: {
                    suit: "spades" | "hearts" | "diamonds" | "clubs";
                    rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                };
                column: number;
                playerIndex: number;
            } | {
                type: "attack";
                playerIndex: number;
                attackerPosition: {
                    row: number;
                    col: number;
                };
                targetPosition: {
                    row: number;
                    col: number;
                };
            } | {
                type: "pass";
                playerIndex: number;
            } | {
                type: "reinforce";
                card: {
                    suit: "spades" | "hearts" | "diamonds" | "clubs";
                    rank: "2" | "3" | "A" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
                };
                playerIndex: number;
            } | {
                type: "forfeit";
                playerIndex: number;
            };
            stateHashBefore: string;
            stateHashAfter: string;
        }[] | undefined;
        outcome?: {
            turnNumber: number;
            winnerIndex: number;
            victoryType: "lpDepletion" | "cardDepletion" | "forfeit";
        } | undefined;
        gameOptions?: {
            damageMode?: "cumulative" | "per-turn" | undefined;
        } | undefined;
    };
    spectatorCount?: number | undefined;
}>, z.ZodObject<{
    type: z.ZodLiteral<"actionError">;
    matchId: z.ZodString;
    error: z.ZodString;
    code: z.ZodString;
}, "strip", z.ZodTypeAny, {
    code: string;
    type: "actionError";
    matchId: string;
    error: string;
}, {
    code: string;
    type: "actionError";
    matchId: string;
    error: string;
}>, z.ZodObject<{
    type: z.ZodLiteral<"matchError">;
    error: z.ZodString;
    code: z.ZodString;
}, "strip", z.ZodTypeAny, {
    code: string;
    type: "matchError";
    error: string;
}, {
    code: string;
    type: "matchError";
    error: string;
}>, z.ZodObject<{
    type: z.ZodLiteral<"opponentDisconnected">;
    matchId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "opponentDisconnected";
    matchId: string;
}, {
    type: "opponentDisconnected";
    matchId: string;
}>, z.ZodObject<{
    type: z.ZodLiteral<"opponentReconnected">;
    matchId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "opponentReconnected";
    matchId: string;
}, {
    type: "opponentReconnected";
    matchId: string;
}>, z.ZodObject<{
    type: z.ZodLiteral<"spectatorJoined">;
    matchId: z.ZodString;
    spectatorId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "spectatorJoined";
    matchId: string;
    spectatorId: string;
}, {
    type: "spectatorJoined";
    matchId: string;
    spectatorId: string;
}>]>;
//# sourceMappingURL=schema.d.ts.map