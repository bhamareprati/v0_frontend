import React from 'react';
import stl from './OutcomeBadge.module.scss';
import { getOutcomeLabel, isUnscoredOutcome } from '@/store/matchOutcome';

/** "Walkover" tag. Renders nothing for regular / unknown outcomes. */
export const OutcomeBadge = ({ outcomeType, className = '' }) => {
    const label = getOutcomeLabel(outcomeType);
    if (!label) return null;

    return (
        <span
            className={`${stl.badge} ${className}`}
            title={`Decided by ${label.toLowerCase()} - no score was played`}
            data-outcome={outcomeType}
        >
            {label}
        </span>
    );
};

/**
 * Score slot of a fixture card. Scored matches show the number exactly as
 * before; matches decided without a score show "Winner" for the winning team
 * (taken from the backend's winner_team_id, never inferred from scores) and a
 * dash for the other team - never a misleading 0.
 */
export const TeamScore = ({ match, teamNumber, className }) => {
    const teamId = teamNumber === 1 ? match.team1_id : match.team2_id;

    if (!isUnscoredOutcome(match.outcome_type)) {
        return <div className={className}>{teamNumber === 1 ? match.team1Score : match.team2Score}</div>;
    }

    return (
        <div className={className}>
            {match.winner_team_id && match.winner_team_id === teamId
                ? <span className={stl.winnerTag}>Winner</span>
                : <span className={stl.noScore}>&ndash;</span>}
        </div>
    );
};

export default OutcomeBadge;
