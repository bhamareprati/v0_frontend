import { useState, useEffect } from 'react';
import { endpoints } from '@/store/urls';
import { apiCall } from '@/store/utils';
import toast from 'react-hot-toast';
import { Button } from '@mui/material';
import SportsTennisIcon from '@mui/icons-material/SportsTennis';
import DeleteIcon from '@mui/icons-material/Delete';
import stl from './PoolFixtures.module.scss';
import { OutcomeBadge } from '@/components/outcomeBadge';
import { isUnscoredOutcome } from '@/store/matchOutcome';

const PoolFixtures = ({ pool, tournamentId, onFixturesChange, isSingles }) => {
    const [fixtures, setFixtures] = useState(null);
    const [loading, setLoading] = useState(false);

    const fetchFixtures = async () => {
        if (!pool?.name) return;
        
        try {
            setLoading(true);
            const response = await apiCall(`${endpoints.matchOps}/pools/${pool.name}/fixtures?tournament_id=${tournamentId}`);
            if (response.error) {
                throw new Error(response.error);
            }
            setFixtures(response);
        } catch (error) {
            console.error('Error fetching fixtures:', error);
            toast.error(error.message || 'Failed to fetch fixtures');
            setFixtures(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (pool?.has_fixtures) {
            fetchFixtures();
        } else {
            setFixtures(null);
        }
    }, [pool?.name, pool?.has_fixtures]);

    const handleGenerateFixtures = async () => {
        try {
            const response = await apiCall(`${endpoints.matchOps}/pools/${pool.name}/fixtures`, {
                method: 'POST',
                body: {
                    tournament_id: tournamentId
                }
            });

            if (response.error) {
                throw new Error(response.error);
            }

            toast.success('Fixtures generated successfully');
            onFixturesChange?.();
        } catch (error) {
            console.error('Error generating fixtures:', error);
            toast.error(error.message || 'Failed to generate fixtures');
        }
    };

    const handleClearFixtures = async () => {
        if (!confirm('Are you sure you want to clear all fixtures? This will remove all matches and scores.')) return;

        try {
            const response = await apiCall(`${endpoints.matchOps}/pools/${pool.name}/fixtures`, {
                method: 'DELETE',
                params: { tournament_id: tournamentId }
            });

            if (response.error) {
                throw new Error(response.error);
            }

            toast.success('Fixtures cleared successfully');
            setFixtures(null);
            onFixturesChange?.();
        } catch (error) {
            console.error('Error clearing fixtures:', error);
            toast.error(error.message || 'Failed to clear fixtures');
        }
    };

    if (!pool) {
        return (
            <div className={stl.noPool}>
                <p>Select a pool to view fixtures</p>
            </div>
        );
    }

    return (
        <div className={stl.fixturesContainer}>
            <div className={stl.header}>
                <h3>Fixtures</h3>
                {pool.has_fixtures && (
                    <Button
                        variant="outlined"
                        color="error"
                        size="small"
                        startIcon={<DeleteIcon />}
                        onClick={handleClearFixtures}
                    >
                        Clear Fixtures
                    </Button>
                )}
            </div>

            <div className={stl.content}>
                {loading ? (
                    <div className={stl.loading}>Loading fixtures...</div>
                ) : !pool.has_fixtures ? (
                    <div className={stl.noFixtures}>
                        <SportsTennisIcon className={stl.icon} />
                        <p>Round Robin Fixtures not yet generated</p>
                        <Button
                            variant="contained"
                            color="primary"
                            onClick={handleGenerateFixtures}
                            disabled={!pool.teams?.length}
                        >
                            Generate Fixtures
                        </Button>
                        {!pool.teams?.length && (
                            <p className={stl.note}>Add {isSingles ? 'players' : 'teams'} to generate fixtures</p>
                        )}
                    </div>
                ) : fixtures?.matches?.length > 0 ? (
                    <div className={stl.fixturesList}>
                        {fixtures.matches.map((match, index) => (
                            <div key={match.match_id} className={stl.matchCard}>
                                <div className={stl.matchHeader}>
                                    <span className={stl.matchNumber}>Match {index + 1}</span>
                                    <span className={`${stl.status} ${stl[match.status]}`}>
                                        {match.status === 'completed' ? 'Completed' :
                                         match.status === 'in_progress' ? 'In Progress' : 'Pending'}
                                    </span>
                                    <OutcomeBadge outcomeType={match.outcome_type} />
                                </div>
                                <div className={stl.teams}>
                                    <div className={`${stl.team} ${match.winner_team_id === match.team1.team_id ? stl.winner : ''}`}>
                                        {!isSingles && <div className={stl.teamName}>{match.team1.name}</div>}
                                        <div className={stl.players}>
                                            {isSingles ? match.team1.players[0] : match.team1.players.join(' & ')}
                                        </div>
                                        {match.scores && !isUnscoredOutcome(match.outcome_type) && (
                                            <div className={stl.score}>{match.scores.team1_score}</div>
                                        )}
                                    </div>
                                    <div className={stl.vs}>vs</div>
                                    <div className={`${stl.team} ${match.winner_team_id === match.team2.team_id ? stl.winner : ''}`}>
                                        {!isSingles && <div className={stl.teamName}>{match.team2.name}</div>}
                                        <div className={stl.players}>
                                            {isSingles ? match.team2.players[0] : match.team2.players.join(' & ')}
                                        </div>
                                        {match.scores && !isUnscoredOutcome(match.outcome_type) && (
                                            <div className={stl.score}>{match.scores.team2_score}</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className={stl.noFixtures}>
                        <SportsTennisIcon className={stl.icon} />
                        <p>No matches found in this pool</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PoolFixtures; 