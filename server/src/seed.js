import dns from 'node:dns';
dns.setServers(['8.8.8.8', '1.1.1.1']);

import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import readline from 'readline';
import { User } from './models/User.js';
import { Product } from './models/Product.js';
import { Customer } from './models/Customer.js';
import { Vendor } from './models/Vendor.js';
import { Employee } from './models/Employee.js';
import { Setting } from './models/Setting.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/nexus-erp';

function ask(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise(resolve => {
    rl.question(query, answer => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function askHidden(query) {
  return new Promise(resolve => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    const stdin = process.stdin;
    process.stdout.write(query);

    let password = '';
    const onData = char => {
      char = char + '';
      switch (char) {
        case '\n':
        case '\r':
        case '\u0004':
          stdin.removeListener('data', onData);
          break;
        default:
          process.stdout.write('*');
          password += char;
          break;
      }
    };

    if (stdin.isTTY) {
      stdin.on('data', onData);
      rl.question('', () => {
        console.log('');
        resolve(password.trim());
      });
    } else {
      rl.question('', ans => {
        resolve(ans.trim());
      });
    }
  });
}

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log('✓ Connected to MongoDB');

  console.log('\n--- Administrator Account Setup ---\n');
  let email = await ask('Admin Email: ');
  while (!email) {
    email = await ask('Admin Email (required): ');
  }

  let password = await askHidden('Admin Password (min 12 chars): ');
  while (!password || password.length < 12) {
    console.log('Password must be at least 12 characters.');
    password = await askHidden('Admin Password (min 12 chars): ');
  }

  const name = (await ask('Display Name [Administrator]: ')) || 'Administrator';

  // Seed Admin User
  let admin = await User.findOne({ email: email.toLowerCase() });
  if (admin) {
    console.log(`ℹ Administrator ${email} already exists; keeping existing credentials.`);
  } else {
    const hashedPassword = await bcrypt.hash(password, 10);
    admin = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: 'Administrator',
      active: true,
    });
    console.log(`✓ Created Administrator account: ${email}`);
  }

  // Seed Company Settings
  let setting = await Setting.findOne({ key: 'company' });
  if (!setting) {
    await Setting.create({
      key: 'company',
      name: 'Northstar Co.',
      data: { currency: 'USD', taxRate: 10 },
    });
    console.log('✓ Initialized default company settings');
  }

  // Seed sample products
  const productCount = await Product.countDocuments();
  if (productCount === 0) {
    await Product.create([
      {
        code: 'PROD-001',
        name: 'Ergonomic Office Chair',
        data: {
          category: 'Furniture',
          stock: 45,
          reorderLevel: 10,
          costPrice: 85,
          sellingPrice: 150,
          unit: 'pcs',
        },
      },
      {
        code: 'PROD-002',
        name: 'Standing Desk (Electric)',
        data: {
          category: 'Furniture',
          stock: 18,
          reorderLevel: 5,
          costPrice: 220,
          sellingPrice: 380,
          unit: 'pcs',
        },
      },
      {
        code: 'PROD-003',
        name: 'Mechanical Keyboard RGB',
        data: {
          category: 'Electronics',
          stock: 4,
          reorderLevel: 10,
          costPrice: 45,
          sellingPrice: 85,
          unit: 'pcs',
        },
      },
      {
        code: 'PROD-004',
        name: 'UltraWide Monitor 34"',
        data: {
          category: 'Electronics',
          stock: 12,
          reorderLevel: 3,
          costPrice: 320,
          sellingPrice: 499,
          unit: 'pcs',
        },
      },
    ]);
    console.log('✓ Seeded sample inventory products');
  }

  // Seed sample Customer
  const customerCount = await Customer.countDocuments();
  if (customerCount === 0) {
    await Customer.create({
      name: 'Acme Global Logistics',
      email: 'purchasing@acmeglobal.com',
      phone: '+1-555-0199',
      address: '742 Evergreen Terrace, Springfield',
    });
    console.log('✓ Seeded sample customer');
  }

  // Seed sample Vendor
  const vendorCount = await Vendor.countDocuments();
  if (vendorCount === 0) {
    await Vendor.create({
      name: 'Apex Office Supplies Ltd.',
      email: 'sales@apexsupplies.com',
      phone: '+1-555-0144',
      address: '100 Industrial Parkway, Sector 4',
    });
    console.log('✓ Seeded sample vendor');
  }

  // Seed sample Employee
  const employeeCount = await Employee.countDocuments();
  if (employeeCount === 0) {
    await Employee.create({
      code: 'EMP-001',
      name: 'Sarah Connor',
      data: {
        department: 'Operations',
        designation: 'Operations Director',
        email: 'sarah.connor@northstar.co',
        status: 'Active',
      },
    });
    console.log('✓ Seeded sample employee');
  }

  console.log('\n✓ Seeding complete!\n');
  await mongoose.disconnect();
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
