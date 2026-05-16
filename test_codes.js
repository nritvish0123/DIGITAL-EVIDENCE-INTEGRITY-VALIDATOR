
function testCodeGeneration() {
    console.log("Testing 5-digit Evidence ID generation:");
    for (let i = 0; i < 5; i++) {
        const id = Math.floor(10000 + Math.random() * 90000).toString();
        console.log(`- ${id} (Length: ${id.length})`);
    }

    console.log("\nTesting 10-digit Evidence Code generation:");
    for (let i = 0; i < 5; i++) {
        const code = Math.floor(1000000000 + Math.random() * 9000000000).toString();
        console.log(`- ${code} (Length: ${code.length})`);
    }
}

testCodeGeneration();
