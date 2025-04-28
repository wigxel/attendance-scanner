import crypto from "node:crypto";

function generateIV(): string {
  const iv = Buffer.alloc(16);
  crypto.randomFillSync(iv);

  return iv.toString('hex');
}

const generatedIV = generateIV();
console.log(`QR_CODE_VI_HEX=${generatedIV}`);
