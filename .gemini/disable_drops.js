#!/usr/bin/env node

/**
 * Script to disable item drops from all enemies
 * This script will modify the dropItems() method in all enemy files
 */

const fs = require('fs');
const path = require('path');

const enemyFiles = [
    'Bear.js',
    'TreeMan.js',
    'ForestGuardian.js',
    'GnollBrute.js',
    'GnollShaman.js',
    'Wolf.js',
    'LargeMushRoom.js',
    'SmallMushRoom.js',
    'Golem.js'
];

const jsDir = path.join(__dirname, '..', 'js');

enemyFiles.forEach(filename => {
    const filepath = path.join(jsDir, filename);

    if (!fs.existsSync(filepath)) {
        console.log(`⚠️  File not found: ${filename}`);
        return;
    }

    let content = fs.readFileSync(filepath, 'utf8');

    // Find and replace dropItems method
    const dropItemsRegex = /dropItems\(\) \{[\s\S]*?\n  \}/;

    const replacement = `dropItems() {
    // Item drops disabled - blood, meat, and diamonds no longer drop
    return;
  }`;

    if (content.match(dropItemsRegex)) {
        content = content.replace(dropItemsRegex, replacement);
        fs.writeFileSync(filepath, content, 'utf8');
        console.log(`✅ Disabled drops in ${filename}`);
    } else {
        console.log(`❌ dropItems() not found in ${filename}`);
    }
});

console.log('\n🎯 Item drops disabled successfully!');
