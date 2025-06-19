// debug-console-helper.js - Enhanced debugging for connection caching issues
// Add this script to your HTML or run these commands in the browser console

console.log('🔧 Connection Caching Debug Helper Loaded');
console.log('================================================');

// Enhanced cache inspection
window.inspectCache = function() {
  console.log('🔍 DETAILED CACHE INSPECTION');
  console.log('============================');
  
  const cacheKey = 'familyTreeCanvas_state';
  const cachedData = localStorage.getItem(cacheKey);
  
  if (!cachedData) {
    console.log('❌ No cache found');
    return;
  }
  
  try {
    const data = JSON.parse(cachedData);
    
    console.log('✅ Cache found with version:', data.version);
    console.log('📊 Cache stats:', {
      format: data.cacheFormat || 'unknown',
      persons: data.persons?.length || 0,
      personDataBackup: data.personDataBackup?.length || 0,
      currentConnections: data.currentConnections?.length || 0,
      hiddenConnections: data.hiddenConnections?.length || 0,
      lineOnlyConnections: data.lineOnlyConnections?.length || 0,
      timestamp: new Date(data.timestamp).toLocaleString()
    });
    
    // Check for relationship data in persons
    if (data.persons) {
      let relationshipCount = 0;
      const relationshipDetails = [];
      
      data.persons.forEach(person => {
        let personRelationships = [];
        if (person.motherId) {
          personRelationships.push(`mother: ${person.motherId}`);
          relationshipCount++;
        }
        if (person.fatherId) {
          personRelationships.push(`father: ${person.fatherId}`);
          relationshipCount++;
        }
        if (person.spouseId) {
          personRelationships.push(`spouse: ${person.spouseId}`);
          relationshipCount++;
        }
        
        if (personRelationships.length > 0) {
          relationshipDetails.push({
            id: person.id,
            name: person.name,
            relationships: personRelationships
          });
        }
      });
      
      console.log(`👥 Persons with relationships: ${relationshipDetails.length}`);
      console.log(`🔗 Total relationship links: ${relationshipCount}`);
      
      if (relationshipDetails.length > 0) {
        console.log('📋 Relationship details:');
        relationshipDetails.forEach(person => {
          console.log(`  ${person.id} (${person.name}): ${person.relationships.join(', ')}`);
        });
      }
    }
    
    // Check personDataBackup
    if (data.personDataBackup) {
      let backupRelationshipCount = 0;
      data.personDataBackup.forEach(([id, personData]) => {
        if (personData.motherId || personData.fatherId || personData.spouseId) {
          backupRelationshipCount++;
        }
      });
      console.log(`💾 Backup relationship entries: ${backupRelationshipCount}`);
    }
    
  } catch (error) {
    console.error('❌ Error parsing cache:', error);
  }
};

// Test cache save/load cycle
window.testCacheCycle = function() {
  console.log('🔄 TESTING CACHE SAVE/LOAD CYCLE');
  console.log('=================================');
  
  if (!window.treeCore) {
    console.error('❌ TreeCore not available');
    return;
  }
  
  const core = window.treeCore;
  
  // Count current state
  const beforeState = {
    nodes: core.renderer?.nodes.size || 0,
    personData: core.personData?.size || 0,
    connections: core.renderer?.connections.length || 0,
    relationships: 0
  };
  
  // Count relationships
  if (core.personData) {
    for (const [id, data] of core.personData) {
      if (data.motherId || data.fatherId || data.spouseId) {
        beforeState.relationships++;
      }
    }
  }
  
  console.log('📊 Before save:', beforeState);
  
  // Save to cache
  console.log('💾 Saving to cache...');
  const saveSuccess = core.saveToCache();
  
  if (!saveSuccess) {
    console.error('❌ Cache save failed');
    return;
  }
  
  console.log('✅ Cache saved successfully');
  
  // Simulate reload by clearing current state
  console.log('🗑️ Clearing current state...');
  core.renderer.nodes.clear();
  core.renderer.clearConnections();
  core.personData = new Map();
  
  // Load from cache
  console.log('📥 Loading from cache...');
  core.loadCachedState().then(loaded => {
    if (loaded) {
      const afterState = {
        nodes: core.renderer?.nodes.size || 0,
        personData: core.personData?.size || 0,
        connections: core.renderer?.connections.length || 0,
        relationships: 0
      };
      
      // Count relationships after load
      if (core.personData) {
        for (const [id, data] of core.personData) {
          if (data.motherId || data.fatherId || data.spouseId) {
            afterState.relationships++;
          }
        }
      }
      
      console.log('📊 After load:', afterState);
      
      // Compare states
      const isMatch = 
        beforeState.nodes === afterState.nodes &&
        beforeState.personData === afterState.personData &&
        beforeState.connections === afterState.connections &&
        beforeState.relationships === afterState.relationships;
      
      if (isMatch) {
        console.log('✅ Cache cycle test PASSED - all data preserved');
      } else {
        console.log('❌ Cache cycle test FAILED - data loss detected');
        console.log('🔍 Differences:', {
          nodes: beforeState.nodes - afterState.nodes,
          personData: beforeState.personData - afterState.personData,
          connections: beforeState.connections - afterState.connections,
          relationships: beforeState.relationships - afterState.relationships
        });
      }
    } else {
      console.error('❌ Cache load failed');
    }
  });
};

// Force fix all connection issues
window.emergencyConnectionFix = function() {
  console.log('🚨 EMERGENCY CONNECTION FIX');
  console.log('============================');
  
  if (!window.treeCore) {
    console.error('❌ TreeCore not available');
    return;
  }
  
  const core = window.treeCore;
  
  console.log('🔍 Analyzing current state...');
  
  // Check current connections
  const currentConnections = core.renderer?.connections.length || 0;
  console.log(`📊 Current connections: ${currentConnections}`);
  
  // Check person data relationships
  let relationshipCount = 0;
  if (core.personData) {
    for (const [id, data] of core.personData) {
      if (data.motherId || data.fatherId || data.spouseId) {
        relationshipCount++;
      }
    }
  }
  console.log(`👥 Persons with relationships: ${relationshipCount}`);
  
  if (currentConnections === 0 && relationshipCount > 0) {
    console.log('🔧 Connections missing but relationships exist - fixing...');
    
    // Try multiple fix strategies
    console.log('1️⃣ Attempting standard regeneration...');
    core.regenerateConnections();
    
    let newConnections = core.renderer?.connections.length || 0;
    console.log(`   Result: ${newConnections} connections`);
    
    if (newConnections === 0) {
      console.log('2️⃣ Attempting cache restoration...');
      
      const cachedData = localStorage.getItem('familyTreeCanvas_state');
      if (cachedData) {
        try {
          const data = JSON.parse(cachedData);
          
          if (data.personDataBackup) {
            console.log('   Restoring from personData backup...');
            core.personData = new Map(data.personDataBackup);
            core.regenerateConnections();
            
            newConnections = core.renderer?.connections.length || 0;
            console.log(`   Result: ${newConnections} connections`);
          }
        } catch (error) {
          console.error('   Cache restoration failed:', error);
        }
      }
    }
    
    if (newConnections === 0) {
      console.log('3️⃣ Attempting manual relationship reconstruction...');
      
      // Try to rebuild relationships from node data
      if (core.renderer && core.renderer.nodes) {
        for (const [id, node] of core.renderer.nodes) {
          const personData = core.personData?.get(id) || {};
          
          // Check if node has relationship data that personData is missing
          if (node.motherId && !personData.motherId) {
            personData.motherId = node.motherId;
            console.log(`   Fixed missing mother relationship for ${id}`);
          }
          if (node.fatherId && !personData.fatherId) {
            personData.fatherId = node.fatherId;
            console.log(`   Fixed missing father relationship for ${id}`);
          }
          if (node.spouseId && !personData.spouseId) {
            personData.spouseId = node.spouseId;
            console.log(`   Fixed missing spouse relationship for ${id}`);
          }
          
          if (!core.personData) {
            core.personData = new Map();
          }
          core.personData.set(id, personData);
        }
        
        core.regenerateConnections();
        newConnections = core.renderer?.connections.length || 0;
        console.log(`   Result: ${newConnections} connections`);
      }
    }
    
    if (newConnections > 0) {
      console.log('✅ Emergency fix successful!');
      console.log('💾 Saving corrected state to cache...');
      core.saveToCache();
      core.pushUndoState();
    } else {
      console.log('❌ Emergency fix failed - manual intervention may be required');
      console.log('💡 Try recreating connections manually through the UI');
    }
  } else if (currentConnections > 0) {
    console.log('✅ Connections appear to be working normally');
  } else {
    console.log('ℹ️ No relationship data found - this may be expected for an empty tree');
  }
};

// Backup current state before making changes
window.backupCurrentState = function() {
  console.log('💾 BACKING UP CURRENT STATE');
  console.log('============================');
  
  if (!window.treeCore) {
    console.error('❌ TreeCore not available');
    return;
  }
  
  const timestamp = Date.now();
  const backupKey = `familyTreeCanvas_manual_backup_${timestamp}`;
  
  try {
    const currentState = window.treeCore.getCurrentState();
    localStorage.setItem(backupKey, JSON.stringify(currentState));
    
    console.log('✅ Backup created successfully');
    console.log(`🔑 Backup key: ${backupKey}`);
    console.log(`📅 Timestamp: ${new Date(timestamp).toLocaleString()}`);
    
    // List all available backups
    const allBackups = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.includes('familyTreeCanvas') && key.includes('backup')) {
        allBackups.push(key);
      }
    }
    
    console.log(`📚 Total backups available: ${allBackups.length}`);
    
    return backupKey;
  } catch (error) {
    console.error('❌ Backup failed:', error);
    return null;
  }
};

// Restore from a specific backup
window.restoreFromBackup = function(backupKey) {
  console.log('📥 RESTORING FROM BACKUP');
  console.log('========================');
  
  if (!window.treeCore) {
    console.error('❌ TreeCore not available');
    return;
  }
  
  if (!backupKey) {
    // List available backups
    const allBackups = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.includes('familyTreeCanvas') && key.includes('backup')) {
        const data = localStorage.getItem(key);
        try {
          const parsed = JSON.parse(data);
          allBackups.push({
            key,
            timestamp: new Date(parsed.timestamp).toLocaleString(),
            persons: parsed.persons?.length || 0
          });
        } catch (e) {
          allBackups.push({ key, timestamp: 'unknown', persons: 0 });
        }
      }
    }
    
    console.log('📚 Available backups:');
    allBackups.forEach((backup, index) => {
      console.log(`${index + 1}. ${backup.key}`);
      console.log(`   Date: ${backup.timestamp}, Persons: ${backup.persons}`);
    });
    
    console.log('💡 Usage: restoreFromBackup("backup_key_here")');
    return;
  }
  
  try {
    const backupData = localStorage.getItem(backupKey);
    if (!backupData) {
      console.error('❌ Backup not found');
      return;
    }
    
    const data = JSON.parse(backupData);
    console.log('📊 Backup contains:', {
      version: data.version,
      persons: data.persons?.length || 0,
      timestamp: new Date(data.timestamp).toLocaleString()
    });
    
    if (confirm('This will replace your current family tree with the backup. Continue?')) {
      window.treeCore.processLoadedData(data);
      console.log('✅ Backup restored successfully');
    } else {
      console.log('❌ Restore cancelled by user');
    }
  } catch (error) {
    console.error('❌ Restore failed:', error);
  }
};

// Advanced connection diagnostics
window.diagnoseConnections = function() {
  console.log('🔬 ADVANCED CONNECTION DIAGNOSTICS');
  console.log('===================================');
  
  if (!window.treeCore) {
    console.error('❌ TreeCore not available');
    return;
  }
  
  const core = window.treeCore;
  
  // Check renderer state
  console.log('🎨 Renderer state:');
  console.log(`   Nodes: ${core.renderer?.nodes.size || 0}`);
  console.log(`   Connections: ${core.renderer?.connections.length || 0}`);
  
  // Check person data state
  console.log('👥 Person data state:');
  console.log(`   PersonData entries: ${core.personData?.size || 0}`);
  
  // Check hidden/line-only connections
  console.log('🔗 Connection modifiers:');
  console.log(`   Hidden connections: ${core.hiddenConnections?.size || 0}`);
  console.log(`   Line-only connections: ${core.lineOnlyConnections?.size || 0}`);
  
  // Detailed relationship analysis
  if (core.personData && core.personData.size > 0) {
    console.log('🔍 Detailed relationship analysis:');
    
    const motherChildPairs = new Set();
    const fatherChildPairs = new Set();
    const spousePairs = new Set();
    
    for (const [childId, childData] of core.personData) {
      if (childData.motherId) {
        motherChildPairs.add(`${childData.motherId}->${childId}`);
      }
      if (childData.fatherId) {
        fatherChildPairs.add(`${childData.fatherId}->${childId}`);
      }
      if (childData.spouseId) {
        const pair = [childId, childData.spouseId].sort().join('<->');
        spousePairs.add(pair);
      }
    }
    
    console.log(`   Mother-child relationships: ${motherChildPairs.size}`);
    console.log(`   Father-child relationships: ${fatherChildPairs.size}`);
    console.log(`   Spouse relationships: ${spousePairs.size}`);
    console.log(`   Total expected connections: ${motherChildPairs.size + fatherChildPairs.size + spousePairs.size}`);
    
    // Check for missing nodes
    const missingNodes = new Set();
    for (const [id, data] of core.personData) {
      if (data.motherId && !core.renderer.nodes.has(data.motherId)) {
        missingNodes.add(data.motherId);
      }
      if (data.fatherId && !core.renderer.nodes.has(data.fatherId)) {
        missingNodes.add(data.fatherId);
      }
      if (data.spouseId && !core.renderer.nodes.has(data.spouseId)) {
        missingNodes.add(data.spouseId);
      }
    }
    
    if (missingNodes.size > 0) {
      console.log(`⚠️ Missing referenced nodes: ${Array.from(missingNodes).join(', ')}`);
    } else {
      console.log('✅ All referenced nodes exist');
    }
  }
  
  // Check actual vs expected connections
  const actualConnections = core.renderer?.connections.length || 0;
  let expectedConnections = 0;
  
  if (core.personData) {
    for (const [id, data] of core.personData) {
      if (data.motherId && core.renderer.nodes.has(data.motherId)) expectedConnections++;
      if (data.fatherId && core.renderer.nodes.has(data.fatherId)) expectedConnections++;
      if (data.spouseId && id < data.spouseId && core.renderer.nodes.has(data.spouseId)) expectedConnections++;
    }
  }
  
  // Add line-only connections
  expectedConnections += (core.lineOnlyConnections?.size || 0);
  
  console.log('📊 Connection summary:');
  console.log(`   Expected connections: ${expectedConnections}`);
  console.log(`   Actual connections: ${actualConnections}`);
  console.log(`   Difference: ${expectedConnections - actualConnections}`);
  
  if (actualConnections < expectedConnections) {
    console.log('⚠️ Some connections are missing - run fixConnections() or emergencyConnectionFix()');
  } else if (actualConnections === expectedConnections) {
    console.log('✅ Connection count matches expectations');
  } else {
    console.log('❓ More connections than expected - may include duplicate or invalid connections');
  }
};

// Initialize help system
console.log('🔧 Enhanced Debug Commands Available:');
console.log('======================================');
console.log('📋 INSPECTION:');
console.log('   inspectCache() - Detailed cache inspection');
console.log('   diagnoseConnections() - Advanced connection diagnostics');
console.log('');
console.log('🔧 REPAIR:');
console.log('   fixConnections() - Standard connection fix');
console.log('   emergencyConnectionFix() - Emergency repair for broken connections');
console.log('   testCacheCycle() - Test cache save/load cycle');
console.log('');
console.log('💾 BACKUP:');
console.log('   backupCurrentState() - Create manual backup');
console.log('   restoreFromBackup() - List/restore backups');
console.log('');
console.log('🔍 MONITORING:');
console.log('   debugCache() - Show basic cache state');
console.log('   showRelationships() - Display family relationships');
console.log('   testConnections() - Test connection regeneration');
console.log('');
console.log('🚨 RESET:');
console.log('   clearCacheAndReload() - Nuclear option (clears everything)');
console.log('');
console.log('💡 QUICK FIX: If connections are missing after refresh, run:');
console.log('   emergencyConnectionFix()');
console.log('');
console.log('🏥 For persistent issues:');
console.log('   1. backupCurrentState()');
console.log('   2. emergencyConnectionFix()');
console.log('   3. If still broken: clearCacheAndReload()');
