'use client';

import React, { useMemo } from 'react';
import { SingleEliminationBracket, Match, SVGViewer, createTheme } from '@g-loot/react-tournament-brackets';
import { isUnscoredOutcome } from '@/store/matchOutcome';

// Text next to a participant: the score, or "W/O" for the winner of a walkover (no score exists)
const resultTextFor = (match, teamIndex) => {
    if (isUnscoredOutcome(match.match_status?.outcome_type)) {
        const teamId = teamIndex === 0 ? match.team1?.team_id : match.team2?.team_id;
        return match.match_status?.winner_team_id === teamId ? 'W/O' : null;
    }
    return match.match_result.split('-')[teamIndex] || null;
};

const theme = createTheme({
    textColor: { main: '#000000', highlighted: '#07090D', dark: '#3E414D' },
    matchBackground: { wonColor: '#e3f2fd', lostColor: '#f8f9fa' },
    score: {
        background: { wonColor: '#1a73e8', lostColor: '#ccc' },
        text: { highlightedWonColor: '#fff', highlightedLostColor: '#000' },
    },
    border: {
        color: '#CED1F2',
        highlightedColor: '#1a73e8',
    },
    roundHeader: { 
        backgroundColor: '#ffffff',
        fontColor: '#1a73e8',
    },
    connectorColor: '#CED1F2',
    connectorColorHighlight: '#1a73e8',
    svgBackground: '#FFFFFF'
});

const KnockoutBracket = ({ matches }) => {
    // Function to format player names to show only first names
    const formatPlayerNames = (players) => {
        if (!players || players === 'TBD') return 'TBD';
        return players
            .split(', ')
            .map(player => player.split(' ')[0]) // Get first name
            .join('/');
    };

    const transformedMatches = useMemo(() => {
        // Filter only knockout matches
        const knockoutMatches = matches.filter(m => m.pool === 'knockout');
        console.log('Total knockout matches:', knockoutMatches.length);

        // Create a map to store unique matches by round and position
        const matchMap = new Map();
        
        knockoutMatches.forEach(match => {
            const roundNum = match.bracket_info?.round_number || 0;
            const position = match.bracket_info?.bracket_position || 0;
            const key = `${roundNum}-${position}`;
            
            if (!matchMap.has(key) || match.round_name === 'Round of 16') {
                matchMap.set(key, match);
            }
        });

        // Convert to array and sort by round_number and bracket_position
        const sortedMatches = Array.from(matchMap.values()).sort((a, b) => {
            const roundDiff = (a.bracket_info?.round_number || 0) - (b.bracket_info?.round_number || 0);
            if (roundDiff !== 0) return roundDiff;
            return (a.bracket_info?.bracket_position || 0) - (b.bracket_info?.bracket_position || 0);
        });

        console.log('Unique matches by round:', 
            sortedMatches.reduce((acc, match) => {
                const round = match.round_name;
                acc[round] = (acc[round] || 0) + 1;
                return acc;
            }, {})
        );

        // Transform matches into the library's format
        const transformedMatches = sortedMatches.map(match => {
            const roundNum = match.bracket_info?.round_number || 0;
            const position = match.bracket_info?.bracket_position || 0;
            
            return {
                id: `${roundNum}-${position}`,
                name: match.match_name,
                nextMatchId: match.bracket_info?.successor ? 
                    `${(match.bracket_info.round_number || 0) + 1}-${Math.floor(position/2)}` : 
                    null,
                nextLooserMatchId: null,
                tournamentRoundText: match.round_name,
                startTime: null,
                state: match.match_status?.status?.toUpperCase() || 'PENDING',
                participants: [
                    {
                        id: match.team1?.team_id || 'TBD',
                        resultText: resultTextFor(match, 0),
                        isWinner: match.match_status?.winner_team_id === match.team1?.team_id,
                        status: match.team1?.checked_in ? 'PLAYED' : null,
                        name: formatPlayerNames(match.team1_players)
                    },
                    {
                        id: match.team2?.team_id || 'TBD',
                        resultText: resultTextFor(match, 1),
                        isWinner: match.match_status?.winner_team_id === match.team2?.team_id,
                        status: match.team2?.checked_in ? 'PLAYED' : null,
                        name: formatPlayerNames(match.team2_players)
                    }
                ]
            };
        });

        console.log('Match connections:', transformedMatches.map(m => ({
            id: m.id,
            name: m.name,
            nextMatchId: m.nextMatchId
        })));

        return transformedMatches;
    }, [matches]);

    if (!matches?.length) {
        return <div>No matches available</div>;
    }

    return (
        <SingleEliminationBracket
            matches={transformedMatches}
            matchComponent={Match}
            theme={theme}
            options={{
                style: {
                    roundHeader: {
                        backgroundColor: '#ffffff',
                        fontColor: '#1a73e8',
                        border: '2px solid #1a73e8',
                        borderRadius: '8px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                        padding: '12px 24px',
                        fontSize: '15px',
                        fontWeight: '600',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        display: 'inline-block',
                        margin: '0 auto 24px auto',
                        minWidth: '180px'
                    },
                    connectorColor: theme.connectorColor,
                    connectorColorHighlight: theme.connectorColorHighlight,
                },
                roundSeparatorWidth: 32,
                lineHeight: 60,
                boxHeight: 80,
            }}
            svgWrapper={({ children, ...props }) => (
                <SVGViewer 
                    width={Math.max(window.innerWidth * 0.9, 320)}
                    height={Math.max(window.innerHeight * 0.8, 400)}
                    scale={window.innerWidth > 768 ? 0.8 : 0.6}
                    customControls={true}
                    controlInitiallyVisible={true}
                    {...props}
                >
                    {children}
                </SVGViewer>
            )}
        />
    );
};

export default KnockoutBracket; 
