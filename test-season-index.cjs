#!/usr/bin/env node

// Test script to verify the season index fix by simulating the buildSeasonIndex logic
const fs = require('fs');
const zlib = require('zlib');

console.log('🧪 Testing season index building with fixed mappings...');

// Award type mapping (copied from the fixed version)
const AWARD_TYPE_MAPPING = {
  // Basketball GM exact case-sensitive mappings (THE FIX)
  'First Team All-League': 'AllLeagueAny',
  'Second Team All-League': 'AllLeagueAny', 
  'Third Team All-League': 'AllLeagueAny',
  
  // Lowercase versions
  'all-league team': 'AllLeagueAny',
  'first team all-league': 'AllLeagueAny',
  'second team all-league': 'AllLeagueAny',
  'third team all-league': 'AllLeagueAny',
  
  // Other awards for testing
  'All-Star': 'AllStar',
  'Most Valuable Player': 'MVP',
  'all-star': 'AllStar',
  'most valuable player': 'MVP'
};

// Simulate the mapAwardToAchievement function
function mapAwardToAchievement(awardType, sport = 'basketball') {
  if (!awardType) return null;
  
  // Try exact match first (this is the critical fix)
  if (AWARD_TYPE_MAPPING[awardType]) {
    return AWARD_TYPE_MAPPING[awardType];
  }
  
  // Try normalized version 
  const normalized = awardType.toLowerCase().trim();
  if (AWARD_TYPE_MAPPING[normalized]) {
    return AWARD_TYPE_MAPPING[normalized];
  }
  
  // Substring fallback for basketball
  if (sport === 'basketball') {
    if (normalized.includes('all') && normalized.includes('league') && normalized.includes('team')) {
      return 'AllLeagueAny';
    }
  }
  
  return null;
}

try {
  // Load the BBGM file
  const filePath = 'attached_assets/BBGM_domalex_2058_regular_season_9-5.json_1757432675478.gz';
  const compressedData = fs.readFileSync(filePath);
  const jsonData = zlib.gunzipSync(compressedData);
  const bbgmData = JSON.parse(jsonData.toString());
  
  console.log(`📁 Loaded BBGM file: ${bbgmData.players?.length || 0} players`);
  
  // Test the mapping on real data
  let mappedCount = 0;
  let unmappedCount = 0;
  let allLeagueMapped = 0;
  let allLeagueUnmapped = 0;
  
  const unmappedAwards = new Set();
  const mappedAwards = new Set();
  
  for (const player of (bbgmData.players || []).slice(0, 1000)) { // Test first 1000 players
    if (player.awards) {
      for (const award of player.awards) {
        const achievementId = mapAwardToAchievement(award.type, 'basketball');
        
        if (achievementId) {
          mappedCount++;
          mappedAwards.add(award.type);
          
          if (achievementId === 'AllLeagueAny') {
            allLeagueMapped++;
          }
        } else {
          unmappedCount++;
          unmappedAwards.add(award.type);
          
          const awardLower = award.type.toLowerCase();
          if (awardLower.includes('all') && (awardLower.includes('league') || awardLower.includes('nba'))) {
            allLeagueUnmapped++;
            console.log(`❌ UNMAPPED ALL-LEAGUE: "${award.type}" for ${player.firstName} ${player.lastName}`);
          }
        }
      }
    }
  }
  
  console.log('\n📊 Mapping Test Results:');
  console.log(`   Total awards processed: ${mappedCount + unmappedCount}`);
  console.log(`   ✅ Mapped: ${mappedCount}`);
  console.log(`   ❌ Unmapped: ${unmappedCount}`);
  console.log(`   🏀 All-League mapped: ${allLeagueMapped}`);
  console.log(`   🚨 All-League unmapped: ${allLeagueUnmapped}`);
  
  console.log('\n🏆 Successfully mapped All-League awards:');
  Array.from(mappedAwards).filter(award => {
    const aLower = award.toLowerCase();
    return aLower.includes('all') && (aLower.includes('league') || aLower.includes('nba'));
  }).forEach(award => {
    console.log(`   ✅ "${award}"`);
  });
  
  if (allLeagueUnmapped > 0) {
    console.log('\n🚨 Still unmapped All-League awards:');
    Array.from(unmappedAwards).filter(award => {
      const aLower = award.toLowerCase();
      return aLower.includes('all') && (aLower.includes('league') || aLower.includes('nba'));
    }).forEach(award => {
      console.log(`   ❌ "${award}"`);
    });
  }
  
  console.log(`\n${allLeagueMapped > 0 ? '✅ SUCCESS' : '❌ FAILED'}: All-League mapping test`);
  
} catch (error) {
  console.error('❌ Error:', error.message);
}