#!/usr/bin/env node

// Simple script to load BBGM file and trigger season index building with debug logs
const fs = require('fs');
const zlib = require('zlib');

// Load one of the attached BBGM files
const filePath = 'attached_assets/BBGM_domalex_2058_regular_season_9-5.json_1757432675478.gz';

console.log('🔍 Loading BBGM file to trigger debug logs...');

try {
  // Read and decompress the .gz file
  const compressedData = fs.readFileSync(filePath);
  const jsonData = zlib.gunzipSync(compressedData);
  const bbgmData = JSON.parse(jsonData.toString());
  
  console.log('📁 BBGM file loaded successfully');
  console.log(`   Players: ${bbgmData.players?.length || 0}`);
  console.log(`   Teams: ${bbgmData.teams?.length || 0}`);
  
  // Find Jaylen Brown-like players and sample their awards
  const samplePlayers = bbgmData.players?.slice(0, 100) || [];
  
  console.log('\n🏆 Sampling award types from first 100 players:');
  const allAwardTypes = new Set();
  const allLeagueAwards = new Set();
  const potentialJaylens = [];
  
  for (const player of samplePlayers) {
    if (player.awards) {
      for (const award of player.awards) {
        allAwardTypes.add(award.type);
        
        const awardLower = award.type.toLowerCase();
        if (awardLower.includes('all') && (awardLower.includes('league') || awardLower.includes('nba'))) {
          allLeagueAwards.add(award.type);
        }
        
        // Look for Jaylen Brown patterns
        if (player.firstName?.includes('Jaylen') || player.lastName?.includes('Brown')) {
          potentialJaylens.push({
            name: `${player.firstName} ${player.lastName}`,
            pid: player.pid,
            awards: player.awards.map(a => a.type)
          });
        }
      }
    }
  }
  
  console.log(`\n📊 Found ${allAwardTypes.size} unique award types`);
  console.log(`🏀 Found ${allLeagueAwards.size} All-League award variants:`);
  
  Array.from(allLeagueAwards).sort().forEach(award => {
    console.log(`   - "${award}"`);
  });
  
  if (potentialJaylens.length > 0) {
    console.log(`\n🎯 Found ${potentialJaylens.length} potential Jaylen Brown players:`);
    potentialJaylens.forEach(player => {
      console.log(`   - ${player.name} (pid: ${player.pid})`);
      player.awards.forEach(award => {
        console.log(`     - "${award}"`);
      });
    });
  }
  
  console.log('\n✅ Debug script completed. Now upload this file in the browser to see full debug logs.');
  
} catch (error) {
  console.error('❌ Error:', error.message);
}