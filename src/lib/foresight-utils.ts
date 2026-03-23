
import { AssumptionHealth } from "@/types/foresight";

/**
 * Returns color styles based on the assumption health net impact score.
 * Maps net_impact_score (-5 to +5) to an HSL hue (Red=0 to Green=140).
 */
export const getHealthColor = (health?: AssumptionHealth) => {
    if (!health) {
        return {
            borderColor: 'hsl(var(--border))',
            glowColor: 'transparent',
            statusColor: 'hsl(var(--muted-foreground))'
        };
    }

    const impact = health.net_impact_score ?? 0;

    // Discrete bands for readability:
    // very negative -> red, near neutral -> amber, very positive -> green
    let borderColor = '#f59e0b'; // amber-500
    let glowColor = 'rgba(245, 158, 11, 0.25)';

    if (impact <= -1.5) {
        borderColor = '#ef4444'; // red-500
        glowColor = 'rgba(239, 68, 68, 0.25)';
    } else if (impact >= 1.5) {
        borderColor = '#10b981'; // emerald-500
        glowColor = 'rgba(16, 185, 129, 0.25)';
    }

    return {
        borderColor,
        glowColor,
        statusColor: borderColor
    };
};

/**
 * Returns the badge variant string for a given verification status.
 */
export const getStatusBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    const s = status.toUpperCase();
    if (s === 'AT RISK' || s === 'INVALIDATED') return 'destructive';
    if (s === 'VALIDATED') return 'default';
    if (s === 'MIXED') return 'secondary';
    return 'outline';
};

const ASSUMPTION_STOP_WORDS = new Set([
    'a',
    'an',
    'and',
    'are',
    'as',
    'at',
    'be',
    'by',
    'for',
    'from',
    'in',
    'into',
    'is',
    'of',
    'on',
    'or',
    'that',
    'the',
    'their',
    'this',
    'to',
    'with',
]);

export const formatConfidenceShorthand = (level?: string) => {
    const clean = String(level || '').trim();
    if (!clean) return '';
    return `Conf. ${clean}`;
};

export const getAssumptionDisplayLabel = (id: string, statement?: string, maxWords = 3) => {
    const clean = String(statement || '')
        .replace(/[`*_#]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    if (!clean) return id;

    const tokens = clean
        .split(' ')
        .map((token) => token.replace(/[^a-zA-Z0-9-]/g, ''))
        .filter((token) => token.length > 2 && !ASSUMPTION_STOP_WORDS.has(token.toLowerCase()));

    const words = (tokens.length > 0 ? tokens : clean.split(' '))
        .slice(0, maxWords)
        .map((token) => token.charAt(0).toUpperCase() + token.slice(1));

    const label = words.join(' ').trim();
    return label ? `${label} (${id})` : id;
};
