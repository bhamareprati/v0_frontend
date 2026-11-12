import { endpoints } from "@/store/urls";
import { apiCall } from "@/store/utils";

/**
 * Match outcomes on the client.
 *
 * `outcome_type` (from the backend) says HOW a match was decided; `status`
 * stays the lifecycle. Outcomes that are decided WITHOUT a numeric score are
 * listed here with their label - a future 'forfeit' is one more entry and every
 * view that uses these helpers picks it up. 'regular' and null (live or
 * historical matches) are deliberately absent: they render exactly as before.
 */
export const UNSCORED_OUTCOME_LABELS = {
    walkover: "Walkover",
};

export const getOutcomeLabel = (outcomeType) => UNSCORED_OUTCOME_LABELS[outcomeType] || null;

export const isUnscoredOutcome = (outcomeType) => getOutcomeLabel(outcomeType) !== null;

/**
 * "11-7" -> { team1Score: 11, team2Score: 7 }.
 * Anything that is not "a-b" (e.g. the "Walkover" label) -> zeros, so views that
 * parse match_result never produce NaN.
 */
export const parseMatchResult = (result) => {
    const parsed = /^(\d+)-(\d+)$/.exec(result || "");
    return parsed
        ? { team1Score: Number(parsed[1]), team2Score: Number(parsed[2]) }
        : { team1Score: 0, team2Score: 0 };
};

/** Players of the winning team of a /get-match-fixtures item, or null. */
export const getFixtureWinnerPlayers = (match) => {
    const winnerId = match?.match_status?.winner_team_id;
    if (!winnerId) return null;
    if (winnerId === match.team1?.team_id) return match.team1_players;
    if (winnerId === match.team2?.team_id) return match.team2_players;
    return null;
};

export const getMatchOutcomeUrl = (matchId) =>
    endpoints.matchOutcome.replace("{match_id}", encodeURIComponent(matchId));

/** POST /matches/{id}/outcome. Rejects with Error(message from the backend). */
export const declareWalkover = (matchId, tournamentId, winnerTeamId) =>
    apiCall(getMatchOutcomeUrl(matchId), {
        method: "POST",
        body: {
            tournament_id: tournamentId,
            outcome_type: "walkover",
            winner_team_id: winnerTeamId,
        },
    });
