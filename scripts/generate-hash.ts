import crypto from "node:crypto";

function generateIV(): string {
  const iv = Buffer.alloc(16);
  crypto.randomFillSync(iv);

  return iv.toString("hex");
}

crypto.randomBytes(32).toString("base64url");

const generatedIV = generateIV();
console.log(`QR_CODE_VI_HEX=${generatedIV}`);
