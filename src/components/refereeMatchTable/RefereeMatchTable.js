import React, { useEffect, useState } from 'react';
import { apiCall } from '@/store/utils';
import { endpoints } from '@/store/urls';
import stl from './RefereeMatchTable.module.scss';
import toast from 'react-hot-toast';
import { Dialog, DialogActions, DialogContent, DialogTitle, Button, TextField } from '@mui/material';
import { OutcomeBadge } from '@/components/outcomeBadge';
import { isUnscoredOutcome, parseMatchResult, getFixtureWinnerPlayers } from '@/store/matchOutcome';

const RefereeMatchTable = ({ tournamentId }) => {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingMatch, setEditingMatch] = useState(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [scores, setScores] = useState({ team1Score: 0, team2Score: 0 });
  const [modalType, setModalType] = useState('start'); // 'start' or 'completed'

  useEffect(() => {
    const fetchMatches = async () => {
      try {
        setLoading(true);
        const response = await apiCall(endpoints.getFixtures, {
          params: { tournament_id: tournamentId }
        });

        if (response && response.matches) {
          setMatches(response.matches);
        }
      } catch (error) {
        console.error('Failed to fetch matches:', error);
        toast.error('Failed to load matches');
      } finally {
        setLoading(false);
      }
    };

    if (tournamentId) {
      fetchMatches();
    }
  }, [tournamentId]);

  const handleStartMatch = async (match) => {
    try {
      await apiCall(`${endpoints.updateMatchStatus}/${match.match_id}`, {
        method: "POST",
        body: {
          tournament_id: tournamentId,
          status: "on-going"
        }
      });
      
      // Update local state
      setMatches(matches.map(m => 
        m.match_id === match.match_id 
          ? { ...m, match_status: { ...m.match_status, status: 'on-going' }} 
          : m
      ));
      
      toast.success("Match started successfully");
    } catch (error) {
      console.error("Failed to start match:", error);
      toast.error(error.message || "Failed to start match");
    }
  };

  const handleScoreUpdate = async (match, isFinal = false, override = false) => {
    try {
      const requestBody = {
        tournament_id: tournamentId,
        match_id: match.match_id,
        score: `${scores.team1Score}-${scores.team2Score}`,
        final: isFinal,
        override: override
      };

      // Finalizing is one backend operation: /update-score with final=true also sets the
      // winner, outcome and status 'completed' (no second concurrent status request).
      const response = await fetch(endpoints.updateMatchScore, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(requestBody),
      });
      const resp = await response.json();

      if (!response.ok) {
        if (response.status === 400 && resp.error?.includes("already been finalized")) {
          const shouldOverride = window.confirm("Match is already finalized. Would you like to override?");
          if (shouldOverride) {
            return handleScoreUpdate(match, isFinal, true);
          }
        }
        throw new Error(resp.error || 'Failed to update score');
      }

      // Update local state
      setMatches(matches.map(m => {
        if (m.match_id === match.match_id) {
          return {
            ...m,
            match_result: `${scores.team1Score}-${scores.team2Score}`,
            match_status: isFinal
              ? { ...m.match_status, status: 'completed', is_final: true, outcome_type: resp.outcome_type, winner_team_id: resp.winner_team_id }
              : m.match_status
          };
        }
        return m;
      }));

      setEditingMatch(null);
      toast.success(isFinal ? 'Match finalized successfully' : 'Score updated successfully');
    } catch (error) {
      console.error('Failed to update score:', error);
      toast.error(error.message || 'Failed to update score');
    }
  };

  const handleEditClick = (match) => {
    if (match.match_status.status === 'completed') {
      setSelectedMatch(match);
      setModalType('completed');
      setShowStatusModal(true);
      return;
    }

    setScores(parseMatchResult(match.match_result));
    setEditingMatch(match);
  };

  const handleStartMatchClick = (match) => {
    setSelectedMatch(match);
    setModalType('start');
    setShowStatusModal(true);
  };

  if (loading) {
    return <div className={stl.loading}>Loading matches...</div>;
  }

  return (
    <div className={stl.container}>
      <div className={stl.tableWrapper}>
        <table className={stl.table}>
          <thead>
            <tr>
              <th>Match ID</th>
              <th>Round</th>
              <th>Pool</th>
              <th>Team 1</th>
              <th>Team 2</th>
              <th>Result</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {matches.map((match) => (
              <tr key={match.match_id}>
                <td>{match.match_id}</td>
                <td>{match.round_name || `Round ${match.round_id}`}</td>
                <td>{match.pool || '-'}</td>
                <td>{match.team1_players}</td>
                <td>{match.team2_players}</td>
                <td>
                  {editingMatch?.match_id === match.match_id ? (
                    <div className={stl.scoreInputs}>
                      <TextField
                        size="small"
                        type="number"
                        value={scores.team1Score}
                        onChange={(e) => setScores({ ...scores, team1Score: Math.max(0, parseInt(e.target.value) || 0) })}
                      />
                      <span>-</span>
                      <TextField
                        size="small"
                        type="number"
                        value={scores.team2Score}
                        onChange={(e) => setScores({ ...scores, team2Score: Math.max(0, parseInt(e.target.value) || 0) })}
                      />
                    </div>
                  ) : isUnscoredOutcome(match.match_status.outcome_type) ? (
                    <>
                      <OutcomeBadge outcomeType={match.match_status.outcome_type} />
                      {getFixtureWinnerPlayers(match) && (
                        <div>Winner: {getFixtureWinnerPlayers(match)}</div>
                      )}
                    </>
                  ) : (
                    match.match_result
                  )}
                </td>
                <td>
                  <span className={`${stl.status} ${stl[match.match_status.status]}`}>
                    {match.match_status.status}
                  </span>
                </td>
                <td>
                  {match.match_status.status === 'pending' && (
                    <button 
                      onClick={() => handleStartMatchClick(match)}
                      className={stl.startButton}
                    >
                      Start Match
                    </button>
                  )}
                  {match.match_status.status === 'on-going' && (
                    editingMatch?.match_id === match.match_id ? (
                      <div className={stl.actionButtons}>
                        <button 
                          onClick={() => handleScoreUpdate(match)}
                          className={stl.updateButton}
                        >
                          Update
                        </button>
                        <button 
                          onClick={() => handleScoreUpdate(match, true)}
                          className={stl.finalizeButton}
                        >
                          Finalize
                        </button>
                        <button 
                          onClick={() => setEditingMatch(null)}
                          className={stl.cancelButton}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => handleEditClick(match)}
                        className={stl.editButton}
                      >
                        Edit Score
                      </button>
                    )
                  )}
                  {/* A walkover has no score to override */}
                  {match.match_status.status === 'completed' && !isUnscoredOutcome(match.match_status.outcome_type) && (
                    <button
                      onClick={() => handleEditClick(match)}
                      className={stl.editButton}
                    >
                      Override Score
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog 
        open={showStatusModal} 
        onClose={() => setShowStatusModal(false)}
      >
        <DialogTitle>
          {modalType === 'start' ? 'Start Match' : 'Match Completed'}
        </DialogTitle>
        <DialogContent>
          {modalType === 'start' ? (
            <p>Are you sure you want to start this match?</p>
          ) : (
            <p>This match has been completed. Would you like to override the scores?</p>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setShowStatusModal(false)}
            style={{ color: '#F28C28' }}
          >
            Cancel
          </Button>
          {modalType === 'start' ? (
            <Button 
              onClick={() => {
                handleStartMatch(selectedMatch);
                setShowStatusModal(false);
              }}
              style={{ color: '#4CAF50' }}
            >
              Start Match
            </Button>
          ) : (
            <Button 
              onClick={() => {
                setScores(parseMatchResult(selectedMatch.match_result));
                setEditingMatch(selectedMatch);
                setShowStatusModal(false);
              }}
              style={{ color: '#4CAF50' }}
            >
              Override Score
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default RefereeMatchTable; 