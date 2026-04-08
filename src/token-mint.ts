import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
} from "@solana/web3.js";
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  transfer,
  burn,
  getMint,
  getAccount,
} from "@solana/spl-token";
import * as dotenv from "dotenv";
import bs58 from "bs58";

dotenv.config();

const connection = new Connection("https://api.devnet.solana.com", "confirmed");

const privateKey = process.env.SECRET_KEY;

const payer = Keypair.fromSecretKey(bs58.decode(privateKey));
console.log("👛 Payer:", payer.publicKey.toBase58());

// ─── Адреса трёх одногруппников (замени на реальные) ───
const RECIPIENTS: PublicKey[] = [
  new PublicKey(process.env.RECIPIENT_1!),
  new PublicKey(process.env.RECIPIENT_2!),
  new PublicKey(process.env.RECIPIENT_3!),
];

const DECIMALS = 6;
const toRaw = (amount: number) => amount * 10 ** DECIMALS;

async function main() {
  // ─── 1. Создаём токен MYCOIN ───
  console.log("\n🪙 Creating MYCOIN...");
  const mint = await createMint(
    connection,
    payer,        // кто платит за транзакцию
    payer.publicKey, // mint authority
    payer.publicKey, // freeze authority
    DECIMALS
  );
  console.log("✅ Mint address:", mint.toBase58());
  console.log(
    "🔗",
    `https://explorer.solana.com/address/${mint.toBase58()}?cluster=devnet`
  );

  // ─── 2. Создаём ATA и минтим 1000 токенов ───
  console.log("\n📦 Creating ATA...");
  const payerATA = await getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    mint,
    payer.publicKey
  );
  console.log("✅ ATA:", payerATA.address.toBase58());

  console.log("\n🏭 Minting 10,000 MYCOIN...");
  await mintTo(
    connection,
    payer,
    mint,
    payerATA.address,
    payer,
    toRaw(10_000)
  );
  console.log("✅ Minted 10,000 MYCOIN");

  // ─── 3. Раздаём трём одногруппникам по 100 токенов ───
  console.log("\n📤 Sending 100 MYCOIN to 3 recipients...");
  for (let i = 0; i < RECIPIENTS.length; i++) {
    const recipientATA = await getOrCreateAssociatedTokenAccount(
      connection,
      payer,
      mint,
      RECIPIENTS[i]
    );

    const sig = await transfer(
      connection,
      payer,
      payerATA.address,
      recipientATA.address,
      payer,
      toRaw(100)
    );

    console.log(`✅ Recipient ${i + 1}:`, RECIPIENTS[i].toBase58());
    console.log(
      "🔗",
      `https://explorer.solana.com/tx/${sig}?cluster=devnet`
    );
  }

  // ─── 4. Сжигаем 50 токенов ───
  console.log("\n🔥 Burning 50 MYCOIN...");
  const burnSig = await burn(
    connection,
    payer,
    payerATA.address,
    mint,
    payer,
    toRaw(50)
  );
  console.log("✅ Burned 50 MYCOIN");
  console.log(
    "🔗",
    `https://explorer.solana.com/tx/${burnSig}?cluster=devnet`
  );

  // ─── 5. Финальный баланс ───
  const account = await getAccount(connection, payerATA.address);
  const balance = Number(account.amount) / 10 ** DECIMALS;
  console.log(`\n💰 Final balance: ${balance} MYCOIN`);
  console.log(
    "🔗 Token in Explorer:",
    `https://explorer.solana.com/address/${mint.toBase58()}?cluster=devnet`
  );
}

main().catch(console.error);