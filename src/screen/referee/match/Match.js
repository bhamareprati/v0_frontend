'use client'

import { useEffect, useState } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { useRouter } from "next/navigation";
import { endpoints } from "@/store/urls";
import { apiCall } from "@/store/utils";
import stl from "./Match.module.scss";
import toast from "react-hot-toast";
import { TextField } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { Dialog, DialogActions, DialogContent, DialogTitle, Button } from "@mui/material";
import { Radio, RadioGroup, FormControlLabel, FormControl } from "@mui/material";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import { OutcomeBadge } from "@/components/outcomeBadge";
import { declareWalkover, getOutcomeLabel, isUnscoredOutcome } from "@/store/matchOutcome";

const teamPlayersText = (team) =>
    (team?.players || []).map((p) => `${p.first_name} ${p.last_name || ""}`.trim()).join(" & ");

const MatchScreen = ({ tournamentId, matchId }) => {
    const [scoreData, setScoreData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setModalOpen] = useState(false);
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [matchStatus, setMatchStatus] = useState(null);
    // Walkover dialog state
    const [walkoverOpen, setWalkoverOpen] = useState(false);
    const [walkoverWinner, setWalkoverWinner] = useState("");
    const [walkoverSubmitting, setWalkoverSubmitting] = useState(false);
    const [walkoverError, setWalkoverError] = useState("");
    const router = useRouter();

    // How the result was decided (null while live / for historical matches)
    const outcomeType = scoreData?.outcome_type || null;
    const decidedWithoutScore = isUnscoredOutcome(outcomeType);

    const getScores = async () => {
        setLoading(true);
        try {
            if (!tournamentId) {
                throw new Error("Tournament ID is missing");
            }

            const response = await apiCall(endpoints.getMatchScore, {
                method: "GET",
                params: {
                    match_id: matchId,
                    tournament_id: tournamentId,
                },
            });
            
            if (!response) {
                throw new Error("Failed to fetch match details");
            }

            setMatchStatus(response.status || 'pending');

            // A match decided by walkover has no score to override: no "override" prompt for it
            if (response.status === 'completed' && !isUnscoredOutcome(response.outcome_type)) {
                setShowStatusModal(true);
            } else if (response.status === 'pending') {
                setShowStatusModal(true);
            } else {
                setShowStatusModal(false);
            }

            setScoreData(response);
            if (response.team1?.score !== undefined) {
                formik.setFieldValue("team1Score", response.team1.score);
            }
            if (response.team2?.score !== undefined) {
                formik.setFieldValue("team2Score", response.team2.score);
            }
        } catch (error) {
            console.error("Failed to fetch Score:", error.message);
            toast.error(error.message || "Failed to fetch match details");
            setScoreData(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (tournamentId && matchId) {
            getScores();
        }
    }, [tournamentId, matchId]);

    const formik = useFormik({
        initialValues: {
            team1Score: 0,
            team2Score: 0,
        },
        validationSchema: Yup.object({
            team1Score: Yup.number().min(0, "Score cannot be negative").required("Required"),
            team2Score: Yup.number().min(0, "Score cannot be negative").required("Required"),
        }),
        onSubmit: (values) => updateScore(),
    });

    const handleScoreChange = (team, scoreChange) => {
        formik.setFieldValue(
            team === "team1" ? "team1Score" : "team2Score",
            Math.max(formik.values[team === "team1" ? "team1Score" : "team2Score"] + scoreChange, 0)
        );
    };

    const resetScore = (team) => {
        formik.setFieldValue(team === "team1" ? "team1Score" : "team2Score", 0);
    };

    const updateScore = async (isFinal = false, override = false) => {
        try {
            const requestBody = {
                tournament_id: tournamentId,
                match_id: matchId,
                score: `${formik.values.team1Score}-${formik.values.team2Score}`,
                final: isFinal,
                override: override
            };

            // Finalizing is ONE backend operation: /update-score with final=true also sets
            // the winner, outcome and status 'completed'. (This screen used to fire a second,
            // concurrent /update-match-status request for the same thing.)
            const response = await fetch(endpoints.updateMatchScore, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(requestBody),
            });

            const resp = await response.json();

            if (!response.ok) {
                if (response.status === 404) {
                    toast.error("Tournament or match not found");
                } else if (response.status === 409) {
                    // e.g. the match was decided by walkover in the meantime
                    toast.error(resp.error);
                } else if (response.status === 400) {
                    if (resp.error.includes("already been finalized")) {
                        const shouldOverride = window.confirm("Match is already finalized. Would you like to override?");
                        if (shouldOverride) {
                            return updateScore(isFinal, true);
                        }
                    }
                    toast.error(resp.error);
                } else {
                    toast.error("An error occurred while updating the score");
                }
                throw new Error(`Error ${response.status}: ${resp.error}`);
            }

            if (resp) {
                toast.success(resp.message);
                formik.setFieldValue("team1Score", resp.team1_score);
                formik.setFieldValue("team2Score", resp.team2_score);
                
                if (isFinal && resp.winner_team_id) {
                    setScoreData(prev => ({
                        ...prev,
                        winner_team_id: resp.winner_team_id
                    }));
                    setMatchStatus('completed');
                }
                
                if (isFinal) {
                    router.push(`/referee/${tournamentId}/matches`);
                }
            }
        } catch (error) {
            console.error("Failed to update score:", error);
            toast.error("Failed to update score. Please try again.");
        }
    };

    const finalizeScore = () => {
        setModalOpen(true);
    };

    const confirmFinalize = () => {
        setModalOpen(false);
        updateScore(true);
    };

    const handleStartMatch = async () => {
        try {
            await apiCall(`${endpoints.updateMatchStatus}/${matchId}`, {
                method: "POST",
                body: {
                    tournament_id: tournamentId,
                    status: "on-going"
                }
            });
            
            setMatchStatus('on-going');
            setShowStatusModal(false);
            toast.success("Match started successfully");
        } catch (error) {
            console.error("Failed to start match:", error);
            toast.error(error.message || "Failed to start match");
        }
    };

    const handleBackToMatches = () => {
        router.push(`/referee/${tournamentId}/matches`);
    };

    const openWalkoverDialog = () => {
        setWalkoverWinner("");
        setWalkoverError("");
        setShowStatusModal(false);
        setWalkoverOpen(true);
    };

    const closeWalkoverDialog = () => {
        if (walkoverSubmitting) return;
        setWalkoverOpen(false);
        // A match that has not started still needs its start / cancel prompt
        if (matchStatus === 'pending') setShowStatusModal(true);
    };

    const confirmWalkover = async () => {
        if (!walkoverWinner) {
            setWalkoverError("Please select the winning team.");
            return;
        }
        setWalkoverSubmitting(true);
        setWalkoverError("");
        try {
            const resp = await declareWalkover(matchId, tournamentId, walkoverWinner);
            toast.success(resp.message || "Walkover recorded successfully");
            setWalkoverOpen(false);
            await getScores(); // refresh: shows the completed walkover result
        } catch (error) {
            console.error("Failed to record walkover:", error);
            setWalkoverError(error.message || "Failed to record walkover");
        } finally {
            setWalkoverSubmitting(false);
        }
    };

    if (loading) {
        return <div className={stl.loading}>Loading match details...</div>;
    }

    if (!scoreData) {
        return <div className={stl.error}>No match data available</div>;
    }

    return (
        <div className={stl.container}>
            <div className={stl.header}>
                <button onClick={handleBackToMatches}>
                    <ArrowBackIcon />
                </button>
                <h2>Update Score</h2>
            </div>

            <div className={stl.matchInfo}>
                <div className={stl.infoItem}>
                    <span className={stl.label}>Status:</span>
                    <span className={`${stl.value} ${stl[matchStatus?.replace('-', '_')] || ''}`}>
                        {matchStatus ? matchStatus.charAt(0).toUpperCase() + matchStatus.slice(1) : 'Unknown'}
                    </span>
                </div>
                {decidedWithoutScore && (
                    <div className={stl.infoItem}>
                        <span className={stl.label}>Outcome:</span>
                        <OutcomeBadge outcomeType={outcomeType} />
                    </div>
                )}
                <div className={stl.infoItem}>
                    <span className={stl.label}>Tournament ID:</span>
                    <span className={stl.value}>{tournamentId}</span>
                </div>
                <div className={stl.infoItem}>
                    <span className={stl.label}>Match ID:</span>
                    <span className={stl.value}>{matchId}</span>
                </div>
            </div>

            {decidedWithoutScore ? (
                // Completed walkover: result panel instead of the score form (nothing to edit)
                <div className={stl.walkoverResult} role="status" aria-live="polite">
                    <OutcomeBadge outcomeType={outcomeType} />
                    <p className={stl.walkoverNote}>
                        This match was finalized by {getOutcomeLabel(outcomeType).toLowerCase()}. No score was played or recorded.
                    </p>
                    <div className={stl.walkoverTeams}>
                        <WalkoverTeam team={scoreData.team1} isWinner={scoreData.winner_team_id === scoreData.team1?.team_id} />
                        <div className={stl.vs}>VS</div>
                        <WalkoverTeam team={scoreData.team2} isWinner={scoreData.winner_team_id === scoreData.team2?.team_id} />
                    </div>
                    <button type="button" className={stl.backButton} onClick={handleBackToMatches}>
                        Back to matches
                    </button>
                </div>
            ) : (
            <form onSubmit={formik.handleSubmit} className={stl.scoreForm}>
                <div className={stl.teams}>
                    <TeamCard
                        team={scoreData.team1}
                        players={scoreData.team1?.players || []}
                        onScoreChange={(change) => handleScoreChange("team1", change)}
                        onReset={() => resetScore("team1")}
                        formik={formik}
                        teamName="team1Score"
                    />

                    <div className={stl.vs}>VS</div>

                    <TeamCard
                        team={scoreData.team2}
                        players={scoreData.team2?.players || []}
                        onScoreChange={(change) => handleScoreChange("team2", change)}
                        onReset={() => resetScore("team2")}
                        formik={formik}
                        teamName="team2Score"
                    />
                </div>

                <div className={stl.actions}>
                    <button type="button" onClick={() => updateScore(false)}>Update</button>
                    <button type="button" onClick={finalizeScore}>Final</button>
                </div>

                {matchStatus !== 'completed' && (
                    <div className={stl.walkoverAction}>
                        <button
                            type="button"
                            onClick={openWalkoverDialog}
                            aria-label="Declare Walkover"
                        >
                            Declare Walkover
                        </button>
                    </div>
                )}
            </form>
            )}

            {isModalOpen && (
                <div className={stl.modal}>
                    <div className={stl.modalContent}>
                        <p>Are you sure you want to finalize the scores?</p>
                        <button onClick={confirmFinalize} style={{ backgroundColor: '#4CAF50', color: 'white' }}>Confirm</button>
                        <button onClick={() => setModalOpen(false)}>Cancel</button>
                    </div>
                </div>
            )}

            <Dialog 
                open={showStatusModal} 
                onClose={handleBackToMatches}
            >
                <DialogTitle>
                    {matchStatus === 'completed' ? 'Match Completed' : 'Match Not Started'}
                </DialogTitle>
                <DialogContent>
                    {matchStatus === 'completed' ? (
                        <p>This match has been completed. Would you like to override the scores?</p>
                    ) : (
                        <p>This match hasn't started yet. Would you like to start the match?</p>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button 
                        onClick={handleBackToMatches}
                        style={{ color: '#F28C28' }}
                    >
                        Cancel
                    </Button>
                    {matchStatus === 'completed' ? (
                        <Button 
                            onClick={() => setShowStatusModal(false)}
                            style={{ color: '#4CAF50' }}
                        >
                            Override Score
                        </Button>
                    ) : (
                        <>
                            <Button
                                onClick={openWalkoverDialog}
                                style={{ color: '#a34e00' }}
                            >
                                Declare Walkover
                            </Button>
                            <Button
                                onClick={handleStartMatch}
                                style={{ color: '#4CAF50' }}
                            >
                                Start Match
                            </Button>
                        </>
                    )}
                </DialogActions>
            </Dialog>

            <Dialog
                open={walkoverOpen}
                onClose={closeWalkoverDialog}
                fullWidth
                maxWidth="xs"
                aria-labelledby="walkover-dialog-title"
            >
                <DialogTitle id="walkover-dialog-title">Declare Walkover</DialogTitle>
                <DialogContent>
                    <p>
                        The match will be finalized as a <strong>walkover</strong> without normal scoring.
                        The selected team is recorded as the winner and no score is saved.
                    </p>
                    <FormControl component="fieldset" disabled={walkoverSubmitting} fullWidth>
                        <RadioGroup
                            aria-label="Winning team"
                            value={walkoverWinner}
                            onChange={(e) => { setWalkoverWinner(e.target.value); setWalkoverError(""); }}
                        >
                            {[scoreData.team1, scoreData.team2].map((team) => (
                                <FormControlLabel
                                    key={team?.team_id}
                                    value={team?.team_id || ""}
                                    control={<Radio />}
                                    label={`Team ${team?.team_id}${team?.name ? ` - ${team.name}` : ""}${teamPlayersText(team) ? ` (${teamPlayersText(team)})` : ""} wins`}
                                />
                            ))}
                        </RadioGroup>
                    </FormControl>
                    {walkoverError && (
                        <p role="alert" style={{ color: '#d32f2f', marginTop: '0.75rem' }}>{walkoverError}</p>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={closeWalkoverDialog} disabled={walkoverSubmitting} style={{ color: '#F28C28' }}>
                        Cancel
                    </Button>
                    <Button
                        onClick={confirmWalkover}
                        disabled={walkoverSubmitting || !walkoverWinner}
                        style={walkoverSubmitting || !walkoverWinner ? undefined : { color: '#4CAF50' }}
                    >
                        {walkoverSubmitting ? "Recording..." : "Confirm Walkover"}
                    </Button>
                </DialogActions>
            </Dialog>
        </div>
    );
};

const WalkoverTeam = ({ team, isWinner }) => (
    <div className={`${stl.walkoverTeam} ${isWinner ? stl.walkoverWinner : ""}`}>
        <h4>Team {team?.team_id || "Unknown"}{team?.name ? ` - ${team.name}` : ""}</h4>
        <p>{teamPlayersText(team)}</p>
        {isWinner && (
            <span className={stl.winnerLabel}><EmojiEventsIcon fontSize="small" /> Winner</span>
        )}
    </div>
);

const TeamCard = ({ team, players = [], onScoreChange, onReset, formik, teamName }) => (
    <div className={stl.teamCard}>
        <div className={stl.teamHeader}>
            <h4>Team {team?.team_id || 'Unknown'}</h4>
            <div className={stl.playerNames}>
                {players.map((player, index) => (
                    <p key={index} className={stl.playerName}>
                        {player.first_name} {player.last_name}
                        {index < players.length - 1 ? " & " : ""}
                    </p>
                ))}
            </div>
        </div>
        
        <TextField
            size="small"
            className={stl.score}
            value={formik.values[teamName]}
            onChange={(e) => formik.setFieldValue(teamName, Math.max(0, Number(e.target.value) || 0))}
            error={Boolean(formik.errors[teamName])}
            helperText={formik.errors[teamName]}
        />
        
        <div className={stl.scoreControls}>
            <button type="button" onClick={() => onScoreChange(1)}>+1</button>
            <button type="button" onClick={() => onScoreChange(-1)}>-1</button>
            <button type="button" className={stl.reset} onClick={onReset}>Reset</button>
        </div>
    </div>
);

export default MatchScreen;
