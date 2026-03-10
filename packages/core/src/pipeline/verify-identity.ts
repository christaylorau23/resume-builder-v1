import { resolveIdentityPillars } from '../identity-defaults';

async function test() {
  console.log('🧪 Testing Identity Pillar Resolution...');
  
  // Test AU Market (Sydney)
  const auPillars = resolveIdentityPillars({ targetMarket: 'AU' });
  if (auPillars.phone === '0403 905 751' && auPillars.email === 'christaylorau23@gmail.com') {
    console.log('✅ AU Identity: PASSED');
  } else {
    console.log('❌ AU Identity: FAILED', auPillars);
  }

  // Test US Market (Cleveland)
  const usPillars = resolveIdentityPillars({ targetMarket: 'US' });
  if (usPillars.phone === '424-388-9521') {
    console.log('✅ US Identity: PASSED');
  } else {
    console.log('❌ US Identity: FAILED', usPillars);
  }
}

test().catch(console.error);
