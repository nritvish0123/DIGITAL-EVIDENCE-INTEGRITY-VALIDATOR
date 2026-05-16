const crypto = require('crypto');

class MultiAuthorityProbabilisticValidator {
    constructor() {
        this.authorities = [
            { id: 'AUTH-PL', name: 'Police Department', weight: 0.4 },
            { id: 'AUTH-FL', name: 'Forensic Lab', weight: 0.35 },
            { id: 'AUTH-CT', name: 'District Court', weight: 0.25 }
        ];
    }

    /**
     * Calculates SHA-256 hash of a file buffer
     * @param {Buffer} buffer 
     * @returns {string} 
     */
    calculateHash(buffer) {
        return crypto.createHash('sha256').update(buffer).digest('hex');
    }

    /**
     * Simulates a multi-authority validation process
     * @param {string} hash 
     * @returns {Object} Validation results
     */
    validate(hash) {
        let totalConfidence = 0;
        const validations = this.authorities.map(auth => {
            // In a real system, this would involve contacting the authority
            // or checking a signed record from them.
            // Here we simulate a high probability of successful validation.
            const isValid = Math.random() > 0.05; // 95% chance of valid
            if (isValid) {
                totalConfidence += auth.weight;
            }

            return {
                authorityId: auth.id,
                authorityName: auth.name,
                status: isValid ? 'VALIDATED' : 'DISPUTED',
                timestamp: new Date().toISOString(),
                signature: crypto.createHmac('sha256', 'secret-key').update(hash + auth.id).digest('hex')
            };
        });

        return {
            hash,
            validations,
            confidenceScore: parseFloat(totalConfidence.toFixed(2)),
            overallStatus: totalConfidence > 0.7 ? 'HIGH_INTEGRITY' : 'NEEDS_REVIEW'
        };
    }

    /**
     * Compares two hashes and returns integrity vs tampering percentage
     * @param {string} originalHash 
     * @param {string} newHash 
     * @returns {Object} { integrity: number, tampered: number }
     */
    compareHashes(originalHash, newHash) {
        if (originalHash === newHash) {
            return { integrity: 100, tampered: 0 };
        }

        // Calculate string similarity for the hash strings
        // This gives a visual "percentage" as requested by user
        let matches = 0;
        const len = Math.max(originalHash.length, newHash.length);
        
        for (let i = 0; i < len; i++) {
            if (originalHash[i] === newHash[i]) {
                matches++;
            }
        }

        const integrity = Math.round((matches / len) * 100);
        return {
            integrity: integrity,
            tamperPercentage: 100 - integrity
        };
    }

    /**
     * Finds the first byte offset where two buffers differ
     * @param {Buffer} buffer1 
     * @param {Buffer} buffer2 
     * @returns {number|null} Offset of first mismatch, or null if identical
     */
    findDifference(buffer1, buffer2) {
        if (!buffer1 || !buffer2) return null;
        
        const len = Math.min(buffer1.length, buffer2.length);
        for (let i = 0; i < len; i++) {
            if (buffer1[i] !== buffer2[i]) {
                return i;
            }
        }

        if (buffer1.length !== buffer2.length) {
            return len;
        }

        return null;
    }
}

module.exports = new MultiAuthorityProbabilisticValidator();
