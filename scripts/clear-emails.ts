import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearAllData() {
  console.log('🗑️  Clearing all email data...');

  try {
    // Delete in order due to foreign key constraints
    const deletedInsights = await prisma.emailInsight.deleteMany({});
    console.log(`✅ Deleted ${deletedInsights.count} email insights`);

    const deletedProfiles = await prisma.senderProfile.deleteMany({});
    console.log(`✅ Deleted ${deletedProfiles.count} sender profiles`);

    const deletedEmails = await prisma.email.deleteMany({});
    console.log(`✅ Deleted ${deletedEmails.count} emails`);

    console.log('\n✨ Database cleaned! Ready to import fresh emails.');
  } catch (error) {
    console.error('❌ Error clearing data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

clearAllData();
