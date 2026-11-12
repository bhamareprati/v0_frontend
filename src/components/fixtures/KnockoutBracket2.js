'use client';

import React, { useMemo } from 'react';
import { Bracket, Seed, SeedItem, SeedTeam } from 'react-brackets';
import { isUnscoredOutcome, parseMatchResult } from '@/store/matchOutcome';

const CustomSeed = ({ seed, breakpoint }) => {
    return (
        <Seed 
            mobileBreakpoint={breakpoint} 
            style={{ fontSize: 14 }}
        >
            <SeedItem>
                <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '4px', 
                    padding: '12px',
                    backgroundColor: '#f8f9fa',
                    border: '1px solid rgb(0, 0, 0)',
                    borderRadius: '7px',
                    minWidth: '200px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    transition: 'all 0.2s ease'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <SeedTeam style={{ 
                            color: seed.teams[0]?.isWinner ? '#1a73e8' : '#202124',
                            fontWeight: seed.teams[0]?.isWinner ? 'bold' : 'normal',
                            fontSize: '14px'
                        }}>
                            {seed.teams[0]?.name || 'TBD'}
                        </SeedTeam>
                        {seed.teams[0]?.score !== undefined && (
                            <span style={{ 
                                marginLeft: '8px',
                                fontWeight: seed.teams[0]?.isWinner ? 'bold' : 'normal',
                                color: seed.teams[0]?.isWinner ? '#1a73e8' : '#5f6368',
                                fontSize: '14px'
                            }}>
                                {seed.teams[0]?.score}
                            </span>
                        )}
                    </div>
                    <div style={{ 
                        width: '100%', 
                        height: '1px', 
                        backgroundColor: '#e0e0e0', 
                        margin: '4px 0' 
                    }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <SeedTeam style={{ 
                            color: seed.teams[1]?.isWinner ? '#1a73e8' : '#202124',
                            fontWeight: seed.teams[1]?.isWinner ? 'bold' : 'normal',
                            fontSize: '14px'
                        }}>
                            {seed.teams[1]?.name || 'TBD'}
                        </SeedTeam>
                        {seed.teams[1]?.score !== undefined && (
                            <span style={{ 
                                marginLeft: '8px',
                                fontWeight: seed.teams[1]?.isWinner ? 'bold' : 'normal',
                                color: seed.teams[1]?.isWinner ? '#1a73e8' : '#5f6368',
                                fontSize: '14px'
                            }}>
                                {seed.teams[1]?.score}
                            </span>
                        )}
                    </div>
                </div>
            </SeedItem>
        </Seed>
    );
};

const KnockoutBracket2 = ({ matches }) => {
    // Function to format player names to show only first names
    const formatPlayerNames = (players) => {
        if (!players || players === 'TBD') return 'TBD';
        return players
            .split(', ')
            .map(player => player.split(' ')[0])
            .join('/');
    };

    const rounds = useMemo(() => {
        if (!matches?.length) return [];

        // Filter knockout matches and group by round
        const knockoutMatches = matches.filter(m => m.pool === 'knockout');
        const roundsMap = new Map();

        knockoutMatches.forEach(match => {
            const roundNum = match.bracket_info?.round_number || 0;
            if (!roundsMap.has(roundNum)) {
                roundsMap.set(roundNum, {
                    title: match.round_name,
                    seeds: []
                });
            }

            const walkover = isUnscoredOutcome(match.match_status?.outcome_type);
            const parsed = parseMatchResult(match.match_result);
            const winnerId = match.match_status?.winner_team_id;
            // Walkover: "W/O" beside the winner, nothing beside the other team (no 0-0)
            const scores = walkover
                ? [winnerId === match.team1?.team_id ? 'W/O' : undefined,
                   winnerId === match.team2?.team_id ? 'W/O' : undefined]
                : [parsed.team1Score, parsed.team2Score];

            roundsMap.get(roundNum).seeds.push({
                id: match.match_id,
                date: null,
                teams: [
                    {
                        name: formatPlayerNames(match.team1_players),
                        score: scores[0],
                        isWinner: match.match_status?.winner_team_id === match.team1?.team_id
                    },
                    {
                        name: formatPlayerNames(match.team2_players),
                        score: scores[1],
                        isWinner: match.match_status?.winner_team_id === match.team2?.team_id
                    }
                ]
            });
        });

        // Convert map to array and sort by round number
        return Array.from(roundsMap.values());
    }, [matches]);

    if (!matches?.length) {
        return <div>No matches available</div>;
    }

    return (
        <div style={{ 
            padding: '20px',
            maxWidth: '100%',
            overflowX: 'auto',
            backgroundColor: '#f8f9fa',
            minHeight: '600px'
        }}>
            <Bracket
                rounds={rounds}
                renderSeedComponent={(props) => (
                    <CustomSeed {...props} />
                )}
                mobileBreakpoint={768}
                roundTitleComponent={(title, roundIndex) => (
                    <div style={{ 
                        textAlign: 'center',
                        padding: '12px 24px',
                        backgroundColor: '#ffffff',
                        color: '#1a73e8',
                        borderRadius: '8px',
                        marginBottom: '24px',
                        fontWeight: '600',
                        fontSize: '15px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                        border: '2px solid #1a73e8',
                        letterSpacing: '0.5px',
                        textTransform: 'uppercase',
                        width: 'fit-content',
                        margin: '0 auto 24px auto'
                    }}>
                        {title}
                    </div>
                )}
                swipeableProps={{
                    enableMouseEvents: true,
                    animateHeight: true
                }}
                bracketClassName="tournament-bracket"
                roundClassName="tournament-round"
            />
        </div>
    );
};

export default KnockoutBracket2; 