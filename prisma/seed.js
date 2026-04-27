/**
 * Prisma Seed Script
 * Run: node prisma/seed.js
 *
 * Seeds:
 *  - 2 Users:   admin / supporter01
 *  - 12 Channels: 3 FB, 3 TikTok, 2 Zalo OA, 2 Web, 2 bonus
 *  - Channel access grants for the Supporter
 *  - Sample customers + conversations + messages
 *  - Quick reply templates
 */
'use strict';

const path = require('path');
const bcrypt = require('bcryptjs');
const Database = require('better-sqlite3');
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');
const { PrismaClient } = require('@prisma/client');

const DB_PATH = path.resolve(__dirname, '../social-manager.db');
// Convert to forward-slash URL (required by PrismaBetterSqlite3 on Windows)
const DB_URL = 'file:' + DB_PATH.replace(/\\/g, '/');
const adapter = new PrismaBetterSqlite3({ url: DB_URL });


const prisma = new PrismaClient({ adapter, log: ['warn', 'error'] });

const BCRYPT_ROUNDS = 10;

async function main() {
  console.log('🌱 Seeding database...\n');

  // ── 1. Users ──────────────────────────────────────────────
  const adminHash = await bcrypt.hash('admin123', BCRYPT_ROUNDS);
  const supporterHash = await bcrypt.hash('supporter123', BCRYPT_ROUNDS);

  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      passwordHash: adminHash,
      displayName: 'Nguyễn Văn Thắng (Admin)',
      role: 'ADMIN',
    },
  });

  const supporter = await prisma.user.upsert({
    where: { username: 'supporter01' },
    update: {},
    create: {
      username: 'supporter01',
      passwordHash: supporterHash,
      displayName: 'Trần Thị Lan (Supporter)',
      role: 'SUPPORTER',
    },
  });

  console.log(`✅ Users: ${admin.username} (ADMIN), ${supporter.username} (SUPPORTER)`);

  // ── 2. Channels (12 nodes) ────────────────────────────────
  const channelDefs = [
    // Facebook (3)
    { platform: 'FACEBOOK', accountId: 'fb-page-001', name: 'Thắng Tin Học - FB Page chính', sortOrder: 0 },
    { platform: 'FACEBOOK', accountId: 'fb-page-002', name: 'Kẹp CNC Shop - FB Bán hàng',    sortOrder: 1 },
    { platform: 'FACEBOOK', accountId: 'fb-page-003', name: 'IT Academy HN - FB Tuyển sinh', sortOrder: 2 },
    // TikTok (3)
    { platform: 'TIKTOK',   accountId: 'tt-001', name: 'TikTok @thangitinhoc',     sortOrder: 0 },
    { platform: 'TIKTOK',   accountId: 'tt-002', name: 'TikTok @kepcncshop',       sortOrder: 1 },
    { platform: 'TIKTOK',   accountId: 'tt-003', name: 'TikTok @congnghehanoi',    sortOrder: 2 },
    // Zalo OA (2)
    { platform: 'ZALO', accountId: 'zalo-oa-001', name: 'Zalo OA - Thắng Tin Học',      webhookSecret: 'zalo-verify-tin-hoc',  sortOrder: 0 },
    { platform: 'ZALO', accountId: 'zalo-oa-002', name: 'Zalo OA - Kẹp CNC Official',   webhookSecret: 'zalo-verify-kep-cnc', sortOrder: 1 },
    // Web Live Chat (2)
    { platform: 'WEB', accountId: 'web-001', name: 'Web Đào Tạo IT - Live Chat',   widgetKey: 'wk_daotao_abc123',   sortOrder: 0 },
    { platform: 'WEB', accountId: 'web-002', name: 'Web Phụ Kiện CNC - Live Chat', widgetKey: 'wk_cnc_xyz456',      sortOrder: 1 },
    // Extra channels for the 12-node target
    { platform: 'FACEBOOK', accountId: 'fb-page-004', name: 'Kẹp CNC - Group Bán Hàng',  sortOrder: 3 },
    { platform: 'TIKTOK',   accountId: 'tt-004',      name: 'TikTok @kepcnc_reviews',    sortOrder: 3 },
  ];

  const channels = [];
  for (const def of channelDefs) {
    const ch = await prisma.channel.upsert({
      where: { platform_accountId: { platform: def.platform, accountId: def.accountId } },
      update: {},
      create: {
        platform: def.platform,
        accountId: def.accountId,
        name: def.name,
        webhookSecret: def.webhookSecret || null,
        widgetKey: def.widgetKey || null,
        sortOrder: def.sortOrder,
        isActive: true,
        // Mock token placeholders (encrypted in production)
        accessToken: `MOCK_ENCRYPTED_TOKEN_${def.accountId.toUpperCase()}`,
      },
    });
    channels.push(ch);
  }

  console.log(`✅ Channels: ${channels.length} nodes created`);
  channels.forEach(c => console.log(`   [${c.platform.padEnd(8)}] ${c.name}`));

  // ── 3. Channel access for Supporter ──────────────────────
  // Supporter only manages the two "Đào Tạo IT" channels (training channels)
  const trainingChannels = channels.filter((c) =>
    c.name.includes('Tin Học') || c.name.includes('Đào Tạo IT') || c.name.includes('IT Academy')
  );

  await prisma.userChannel.deleteMany({ where: { userId: supporter.id } });
  for (const ch of trainingChannels) {
    await prisma.userChannel.upsert({
      where: { userId_channelId: { userId: supporter.id, channelId: ch.id } },
      update: {},
      create: { userId: supporter.id, channelId: ch.id },
    });
  }
  console.log(`\n✅ Supporter access: ${trainingChannels.length} channels (${trainingChannels.map(c => c.name).join(', ')})`);

  // ── 4. Customers ──────────────────────────────────────────
  const customers = await Promise.all([
    prisma.customer.upsert({
      where: { phone: '0901234567' },
      update: {},
      create: { fullName: 'Nguyễn Minh Tuấn', phone: '0901234567', email: 'tuan.nm@email.com',
        tags: JSON.stringify(['Học viên', 'IC3']), notes: 'Quan tâm IC3, hỏi lịch tối T3-T5.' },
    }),
    prisma.customer.upsert({
      where: { phone: '0912345678' },
      update: {},
      create: { fullName: 'Trần Thị Hoa', phone: '0912345678',
        tags: JSON.stringify(['VIP', 'Đào tạo 1-1']), notes: 'Đã học 2 khóa, cần 1-1 nâng cao.' },
    }),
    prisma.customer.upsert({
      where: { phone: '0934567890' },
      update: {},
      create: { fullName: 'Võ Quang Huy', phone: '0934567890',
        tags: JSON.stringify(['Mua sỉ', 'Kẹp CNC']), notes: 'Hỏi giá sỉ 5 kẹp CNC V2.' },
    }),
  ]);

  console.log(`\n✅ Customers: ${customers.length} seeded`);

  // ── 5. Conversations + Messages ───────────────────────────
  const fbChannel = channels.find(c => c.accountId === 'fb-page-001');
  const zaloChannel = channels.find(c => c.accountId === 'zalo-oa-001');
  const webChannel = channels.find(c => c.accountId === 'web-001');

  const convData = [
    {
      channelId: zaloChannel.id, customerId: customers[0].id,
      externalId: 'zalo-user-tuananh001', participantName: 'Nguyễn Minh Tuấn',
      assignedToUserId: supporter.id,
      messages: [
        { senderType: 'CUSTOMER', content: 'Chào trung tâm! Em muốn hỏi về khóa IC3.' },
        { senderType: 'STAFF',    content: 'Chào em! Khóa IC3 20 buổi giá 2.5 triệu, khai giảng T3-T5 tối nhé.', sentByUserId: supporter.id },
        { senderType: 'CUSTOMER', content: 'Dạ cho em hỏi khóa IC3 khai giảng khi nào ạ?' },
      ],
    },
    {
      channelId: fbChannel.id, customerId: customers[1].id,
      externalId: 'fb-psid-hoatran002', participantName: 'Trần Thị Hoa',
      assignedToUserId: supporter.id,
      messages: [
        { senderType: 'CUSTOMER', content: 'Mình muốn học thêm Word & Excel nâng cao.' },
        { senderType: 'STAFF',    content: '1 kèm 1 trực tiếp 200k/buổi chị ơi!', sentByUserId: supporter.id },
        { senderType: 'CUSTOMER', content: 'Mình muốn đăng ký đào tạo 1 kèm 1 trực tiếp được không?' },
      ],
    },
    {
      channelId: webChannel.id, customerId: null,
      externalId: 'web-session-abc999', participantName: 'Website Visitor',
      messages: [
        { senderType: 'CUSTOMER', content: 'Hi! Tôi muốn hỏi về khóa tin học văn phòng.' },
        { senderType: 'BOT',      content: 'Xin chào! Vui lòng để lại số điện thoại, tư vấn viên sẽ liên hệ sớm nhất.' },
      ],
    },
  ];

  for (const cd of convData) {
    const conv = await prisma.conversation.upsert({
      where: { channelId_externalId: { channelId: cd.channelId, externalId: cd.externalId } },
      update: {},
      create: {
        channelId: cd.channelId,
        customerId: cd.customerId,
        externalId: cd.externalId,
        participantName: cd.participantName,
        assignedToUserId: cd.assignedToUserId || null,
        status: 'OPEN',
        lastMessage: cd.messages.at(-1).content,
        lastMessageAt: new Date(),
      },
    });

    for (const msg of cd.messages) {
      await prisma.message.create({
        data: {
          conversationId: conv.id,
          senderType: msg.senderType,
          sentByUserId: msg.sentByUserId || null,
          content: msg.content,
          timestamp: new Date(),
        },
      });
    }
  }

  console.log(`✅ Conversations: ${convData.length} seeded with messages`);

  // ── 6. Quick Reply templates ──────────────────────────────
  const qrTemplates = [
    { command: '/baogia',       label: 'Báo giá',         category: 'sales',    content: 'Dạ chào anh/chị! 😊\n\nBáo giá các khóa:\n• IC3 Digital Literacy (20 buổi): 2.500.000đ\n• Tin học VP (15 buổi): 1.800.000đ\n• 1 kèm 1 trực tiếp: 200.000đ/buổi\n• 1 kèm 1 Zoom: 150.000đ/buổi\n\n📞 Liên hệ: 0909.xxx.xxx' },
    { command: '/diachi',       label: 'Địa chỉ',         category: 'info',     content: '📍 Số 123, Nguyễn Huệ, Q.1 TP.HCM\n🕐 T2-T6: 8:00-21:00 | T7-CN: 8:00-17:00' },
    { command: '/lichhoc',      label: 'Lịch học',        category: 'schedule', content: '📅 Tháng 5/2026:\n🔵 IC3: T3-T5 tối (18:00-20:00)\n🟢 Tin học VP: T2-T4-T6 chiều\n💡 1-1: linh hoạt theo lịch học viên\nĐăng ký sớm giảm 10%! 🎉' },
    { command: '/camondangky',  label: 'Cảm ơn đăng ký',  category: 'followup', content: 'Cảm ơn anh/chị đã đăng ký! 🎉\nThông tin chi tiết sẽ gửi qua email/Zalo trong 24h.' },
    { command: '/kepdienthoai', label: 'Báo giá kẹp CNC', category: 'product',  content: '📱 Kẹp CNC cao cấp:\n• V2 (xe máy): 350.000đ\n• Pro (ô tô): 450.000đ\n• Max (đa năng): 550.000đ\n✅ BH 12 tháng | Free ship >500k' },
  ];

  for (const qr of qrTemplates) {
    await prisma.quickReply.upsert({
      where: { command: qr.command },
      update: {},
      create: qr,
    });
  }

  console.log(`✅ Quick Replies: ${qrTemplates.length} templates\n`);
  console.log('─────────────────────────────────────');
  console.log('🎉 Seed complete!\n');
  console.log('Login credentials:');
  console.log('  Admin:    admin / admin123');
  console.log('  Supporter: supporter01 / supporter123');
  console.log('─────────────────────────────────────');
}

main()
  .catch((err) => { console.error('❌ Seed failed:', err); process.exit(1); })
  .finally(() => prisma.$disconnect());
