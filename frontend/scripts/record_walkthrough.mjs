import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function smoothScroll(page, targetY, steps = 30, delayMs = 25) {
  const currentY = await page.evaluate(() => window.scrollY);
  const diff = targetY - currentY;
  for (let i = 1; i <= steps; i++) {
    const progress = i / steps;
    const ease = progress < 0.5 ? 2 * progress * progress : -1 + (4 - 2 * progress) * progress;
    const nextY = Math.round(currentY + diff * ease);
    await page.evaluate((y) => window.scrollTo(0, y), nextY);
    await sleep(delayMs);
  }
  await sleep(100);
}

async function injectOverlay(page) {
  await page.evaluate(() => {
    if (document.getElementById('dentflow-walkthrough-hud')) return;

    const style = document.createElement('style');
    style.id = 'dentflow-hud-style';
    style.innerHTML = `
      #dentflow-walkthrough-hud {
        position: fixed;
        bottom: 28px;
        right: 32px;
        z-index: 9999999;
        display: flex;
        align-items: center;
        gap: 16px;
        background: rgba(15, 23, 42, 0.92);
        backdrop-filter: blur(20px);
        border: 1px solid rgba(56, 189, 248, 0.45);
        box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.7), 0 0 30px rgba(14, 165, 233, 0.35);
        border-radius: 16px;
        padding: 14px 22px;
        font-family: 'Outfit', 'Inter', -apple-system, sans-serif;
        color: #ffffff;
        transform: translateY(0);
        opacity: 1;
        transition: all 0.3s ease;
        pointer-events: none;
        max-width: 560px;
      }
      #dentflow-hud-badge {
        background: linear-gradient(135deg, #0ea5e9, #6366f1);
        color: #ffffff;
        font-size: 11px;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 1.2px;
        padding: 7px 13px;
        border-radius: 8px;
        white-space: nowrap;
        box-shadow: 0 2px 12px rgba(14, 165, 233, 0.5);
      }
      #dentflow-hud-content {
        display: flex;
        flex-direction: column;
        gap: 3px;
      }
      #dentflow-hud-title {
        font-size: 16px;
        font-weight: 700;
        color: #f8fafc;
        letter-spacing: -0.2px;
      }
      #dentflow-hud-subtitle {
        font-size: 13px;
        font-weight: 400;
        color: #94a3b8;
        line-height: 1.35;
      }
      #dentflow-custom-cursor {
        position: fixed;
        width: 22px;
        height: 22px;
        border: 2px solid #38bdf8;
        background: rgba(14, 165, 233, 0.35);
        border-radius: 50%;
        pointer-events: none;
        z-index: 10000000;
        transform: translate(-50%, -50%);
        transition: transform 0.08s ease-out, background 0.15s ease, border-color 0.15s ease;
        box-shadow: 0 0 14px rgba(56, 189, 248, 0.7);
      }
    `;
    document.head.appendChild(style);

    const hud = document.createElement('div');
    hud.id = 'dentflow-walkthrough-hud';
    hud.innerHTML = `
      <div id="dentflow-hud-badge">FEATURE SPOTLIGHT</div>
      <div id="dentflow-hud-content">
        <div id="dentflow-hud-title">DentFlow Platform</div>
        <div id="dentflow-hud-subtitle">Next-Gen SaaS for Dental Practices</div>
      </div>
    `;
    document.body.appendChild(hud);

    const cursor = document.createElement('div');
    cursor.id = 'dentflow-custom-cursor';
    cursor.style.left = '-100px';
    cursor.style.top = '-100px';
    document.body.appendChild(cursor);

    window.addEventListener('mousemove', (e) => {
      cursor.style.left = e.clientX + 'px';
      cursor.style.top = e.clientY + 'px';
    });
  });
}

async function updateSpotlight(page, badge, title, subtitle) {
  await page.evaluate(({ badge, title, subtitle }) => {
    const bEl = document.getElementById('dentflow-hud-badge');
    const tEl = document.getElementById('dentflow-hud-title');
    const sEl = document.getElementById('dentflow-hud-subtitle');
    if (bEl) bEl.innerText = badge;
    if (tEl) tEl.innerText = title;
    if (sEl) sEl.innerText = subtitle;
  }, { badge, title, subtitle });
  await sleep(250);
}

async function moveMouseSmoothly(page, targetX, targetY, steps = 15) {
  await page.mouse.move(targetX, targetY, { steps });
}

async function run() {
  console.log('🚀 Starting DentFlow Professional Walkthrough Recording...');

  const videoDir = path.resolve('..', 'walkthrough_video');
  if (!fs.existsSync(videoDir)) {
    fs.mkdirSync(videoDir, { recursive: true });
  }

  const browser = await chromium.launch({
    headless: true,
    args: ['--window-size=1920,1080', '--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: {
      dir: videoDir,
      size: { width: 1920, height: 1080 }
    }
  });

  const page = await context.newPage();
  page.setDefaultTimeout(15000);

  // =========================================================================
  // SCENE 1: LANDING PAGE & BRAND PROPOSITION
  // =========================================================================
  console.log('🎬 Scene 1: Landing Page Hero & Value Proposition...');
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' });
  await sleep(800);
  await injectOverlay(page);
  await updateSpotlight(
    page,
    'DENTFLOW SAAS',
    'Modern Dental Practice Management',
    'Unified clinical workflows, intelligent billing, and patient records.'
  );

  await moveMouseSmoothly(page, 960, 420);
  await sleep(1500);

  await updateSpotlight(
    page,
    'PLATFORM ARCHITECTURE',
    'Multi-Tenant Practice Operating System',
    'Designed specifically for clinic owners, associate doctors, and staff.'
  );
  await smoothScroll(page, 700, 25, 25);
  await sleep(1500);

  await smoothScroll(page, 1400, 25, 25);
  await sleep(1500);

  await smoothScroll(page, 0, 25, 20);
  await sleep(800);

  // =========================================================================
  // SCENE 2: SEAMLESS CLINIC OWNER AUTHENTICATION
  // =========================================================================
  console.log('🎬 Scene 2: Clinic Authentication...');
  await page.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded' });
  await sleep(600);
  await injectOverlay(page);
  await updateSpotlight(
    page,
    'SECURITY & TENANCY',
    'Role-Based Clinic Authentication',
    'Isolated tenant databases with SimpleJWT authentication.'
  );

  await moveMouseSmoothly(page, 960, 460);
  const emailInput = page.locator('input[name="email"]');
  if (await emailInput.count() > 0) {
    await emailInput.click();
    await emailInput.fill('doctor');
  }
  await sleep(250);

  const pwdInput = page.locator('input[name="password"]');
  if (await pwdInput.count() > 0) {
    await pwdInput.click();
    await pwdInput.fill('password123');
  }
  await sleep(300);

  const submitBtn = page.locator('button[type="submit"]');
  await moveMouseSmoothly(page, 960, 610);
  if (await submitBtn.count() > 0) {
    await submitBtn.click();
  }
  await sleep(1500);

  // =========================================================================
  // SCENE 3: EXECUTIVE CLINIC DASHBOARD
  // =========================================================================
  console.log('🎬 Scene 3: Executive Clinic Dashboard...');
  await page.goto('http://localhost:3000/dashboard', { waitUntil: 'domcontentloaded' });
  await sleep(1000);
  await injectOverlay(page);
  await updateSpotlight(
    page,
    'EXECUTIVE DASHBOARD',
    'Real-Time Clinic Intelligence & Metrics',
    'Live stats on revenue, appointments, active treatments & quick actions.'
  );

  await moveMouseSmoothly(page, 520, 220);
  await sleep(1000);
  await moveMouseSmoothly(page, 850, 220);
  await sleep(900);
  await moveMouseSmoothly(page, 1180, 220);
  await sleep(900);

  await smoothScroll(page, 450, 25, 25);
  await sleep(1800);
  await smoothScroll(page, 0, 20, 20);
  await sleep(600);

  // =========================================================================
  // SCENE 4: UNIFIED CLINICAL VISIT FORM (FLAGSHIP WORKFLOW)
  // =========================================================================
  console.log('🎬 Scene 4: Unified Clinical Visit Form...');
  await page.goto('http://localhost:3000/patients/new', { waitUntil: 'domcontentloaded' });
  await sleep(1200);
  await injectOverlay(page);
  await updateSpotlight(
    page,
    'FLAGSHIP FEATURE',
    'Unified Clinical Consultation Log',
    'Record diagnosis, treatments, multi-dose prescriptions & follow-ups in one view.'
  );

  await moveMouseSmoothly(page, 600, 280);
  await sleep(1000);

  const chiefComplaint = page.locator('textarea[name="visit.chief_complaint"], input[name="visit.chief_complaint"]').first();
  if (await chiefComplaint.count() > 0) {
    await chiefComplaint.click();
    await chiefComplaint.fill('Severe sensitivity & throbbing pain in upper left premolar (#24).');
  }

  const diagnosisInput = page.locator('textarea[name="visit.diagnosis"], input[name="visit.diagnosis"]').first();
  if (await diagnosisInput.count() > 0) {
    await diagnosisInput.click();
    await diagnosisInput.fill('Acute Pulpitis #24 with Deep Occlusal Caries');
  }

  const treatmentInput = page.locator('textarea[name="visit.treatment_given"], input[name="visit.treatment_given"]').first();
  if (await treatmentInput.count() > 0) {
    await treatmentInput.click();
    await treatmentInput.fill('Rotary canal instrumentation and medicament placement done under LA.');
  }

  await smoothScroll(page, 350, 20, 25);
  await sleep(2000);

  // =========================================================================
  // SCENE 5: INTERACTIVE FULLCALENDAR APPOINTMENT SCHEDULER
  // =========================================================================
  console.log('🎬 Scene 5: Interactive FullCalendar...');
  await page.goto('http://localhost:3000/calendar', { waitUntil: 'domcontentloaded' });
  await sleep(1500);
  await injectOverlay(page);
  await updateSpotlight(
    page,
    'SMART SCHEDULING',
    'Interactive FullCalendar Integration',
    'Color-coded timeline (Blue: Upcoming, Green: Completed) with instant previews.'
  );

  await moveMouseSmoothly(page, 960, 480);
  await sleep(1800);

  const calendarEvent = page.locator('.fc-event').first();
  if (await calendarEvent.count() > 0) {
    await calendarEvent.hover();
    await sleep(600);
    await calendarEvent.click();
    await sleep(1500);
  }

  // =========================================================================
  // SCENE 6: BILLING, PAYMENTS & PDF INVOICE GENERATION
  // =========================================================================
  console.log('🎬 Scene 6: Billing & Invoicing...');
  await page.goto('http://localhost:3000/billing', { waitUntil: 'domcontentloaded' });
  await sleep(1200);
  await injectOverlay(page);
  await updateSpotlight(
    page,
    'FINANCIAL OPERATIONS',
    'Automated Billing & Installment Tracking',
    'Itemized dental treatments, GST calculations, multi-mode payments & PDF invoices.'
  );

  await moveMouseSmoothly(page, 720, 320);
  await sleep(1500);

  const viewBillBtn = page.locator('button:has-text("View"), [aria-label="view"]').first();
  if (await viewBillBtn.count() > 0) {
    await viewBillBtn.click();
    await sleep(1800);
    const closeBtn = page.locator('button:has-text("Close")').first();
    if (await closeBtn.count() > 0) await closeBtn.click();
  }

  await sleep(800);

  // =========================================================================
  // SCENE 7: DENTAL LAB TRACKING & PROSTHETICS
  // =========================================================================
  console.log('🎬 Scene 7: Dental Lab Work Tracking...');
  await page.goto('http://localhost:3000/lab-work', { waitUntil: 'domcontentloaded' });
  await sleep(1200);
  await injectOverlay(page);
  await updateSpotlight(
    page,
    'LAB OPERATIONS',
    'Dental Lab Order & Prosthetics Tracker',
    'Manage Zirconia crowns, aligners, and bridge orders with live turnaround status.'
  );

  await moveMouseSmoothly(page, 800, 360);
  await sleep(2000);

  // =========================================================================
  // SCENE 8: 360° PATIENT RECORDS & MEDICAL HISTORY
  // =========================================================================
  console.log('🎬 Scene 8: Patient Master Directory & 360 Timeline...');
  await page.goto('http://localhost:3000/patients', { waitUntil: 'domcontentloaded' });
  await sleep(1200);
  await injectOverlay(page);
  await updateSpotlight(
    page,
    'PATIENT 360°',
    'Comprehensive Digital Health Records',
    'Medical allergy alerts, consultation timelines, invoices & treatment history.'
  );

  await moveMouseSmoothly(page, 640, 300);
  await sleep(1000);

  const firstPatientRow = page.locator('table tbody tr').first();
  if (await firstPatientRow.count() > 0) {
    await firstPatientRow.click();
    await sleep(1800);
    await smoothScroll(page, 300, 20, 25);
    await sleep(1500);
    await smoothScroll(page, 0, 15, 20);
  }

  // =========================================================================
  // SCENE 9: CLINIC CUSTOMIZATION & DOCTOR DIRECTORY
  // =========================================================================
  console.log('🎬 Scene 9: Clinic Settings & Pricing Catalog...');
  await page.goto('http://localhost:3000/settings', { waitUntil: 'domcontentloaded' });
  await sleep(1200);
  await injectOverlay(page);
  await updateSpotlight(
    page,
    'CLINIC CUSTOMIZATION',
    'Multi-Doctor Roster & Treatment Catalog',
    'Configure clinic profile, doctor shift timings, and standard procedure fees.'
  );

  await smoothScroll(page, 300, 20, 25);
  await sleep(1800);

  // =========================================================================
  // SCENE 10: MULTI-TENANT SAAS ADMIN PORTAL
  // =========================================================================
  console.log('🎬 Scene 10: Multi-Tenant Super Admin...');
  await page.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded' });
  await sleep(600);
  await injectOverlay(page);
  await updateSpotlight(
    page,
    'SAAS ADMIN',
    'Multi-Tenant Platform Administration',
    'Global clinic roster, tenant switcher & SaaS subscription analytics.'
  );

  const adminEmail = page.locator('input[name="email"]');
  if (await adminEmail.count() > 0) {
    await adminEmail.fill('admin');
  }
  const adminPwd = page.locator('input[name="password"]');
  if (await adminPwd.count() > 0) {
    await adminPwd.fill('Atharva@2026');
  }
  const adminSubmit = page.locator('button[type="submit"]');
  if (await adminSubmit.count() > 0) {
    await adminSubmit.click();
  }
  await sleep(1500);

  await page.goto('http://localhost:3000/admin/dashboard', { waitUntil: 'domcontentloaded' });
  await sleep(1800);

  // =========================================================================
  // SCENE 11: CINEMATIC OUTRO & CALL TO ACTION
  // =========================================================================
  console.log('🎬 Scene 11: Cinematic Outro Card...');
  await page.evaluate(() => {
    document.body.innerHTML = `
      <div style="
        width: 100vw;
        height: 100vh;
        background: radial-gradient(circle at 50% 30%, #1e293b 0%, #0f172a 100%);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        font-family: 'Outfit', 'Inter', -apple-system, sans-serif;
        color: #ffffff;
        text-align: center;
        padding: 40px;
        box-sizing: border-box;
      ">
        <div style="
          display: inline-flex;
          align-items: center;
          gap: 12px;
          background: rgba(56, 189, 248, 0.12);
          border: 1px solid rgba(56, 189, 248, 0.35);
          padding: 8px 20px;
          border-radius: 9999px;
          margin-bottom: 24px;
        ">
          <span style="font-size: 20px;">🦷</span>
          <span style="font-size: 14px; font-weight: 700; letter-spacing: 1px; color: #38bdf8; text-transform: uppercase;">
            DENTFLOW PLATFORM
          </span>
        </div>

        <h1 style="
          font-size: 52px;
          font-weight: 800;
          letter-spacing: -1.5px;
          margin: 0 0 16px 0;
          background: linear-gradient(135deg, #ffffff 40%, #94a3b8 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        ">
          The Operating System for Modern Dental Clinics
        </h1>

        <p style="
          font-size: 20px;
          color: #94a3b8;
          max-width: 780px;
          line-height: 1.6;
          margin: 0 0 40px 0;
        ">
          Streamlining clinical consultations, smart scheduling, digital prescriptions, lab orders, and billing in one seamless multi-tenant platform.
        </p>

        <div style="
          display: flex;
          align-items: center;
          gap: 20px;
          margin-bottom: 48px;
        ">
          <div style="
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            padding: 12px 24px;
            border-radius: 12px;
            font-size: 15px;
            font-weight: 600;
            color: #e2e8f0;
          ">
            ⚡ React 19 + TypeScript
          </div>
          <div style="
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            padding: 12px 24px;
            border-radius: 12px;
            font-size: 15px;
            font-weight: 600;
            color: #e2e8f0;
          ">
            🐍 Django 6 REST API
          </div>
          <div style="
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            padding: 12px 24px;
            border-radius: 12px;
            font-size: 15px;
            font-weight: 600;
            color: #e2e8f0;
          ">
            📅 FullCalendar Interactive
          </div>
          <div style="
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            padding: 12px 24px;
            border-radius: 12px;
            font-size: 15px;
            font-weight: 600;
            color: #e2e8f0;
          ">
            🔒 Multi-Tenant SimpleJWT
          </div>
        </div>

        <div style="
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        ">
          <div style="
            background: linear-gradient(135deg, #0ea5e9, #6366f1);
            color: #ffffff;
            font-size: 18px;
            font-weight: 700;
            padding: 16px 36px;
            border-radius: 12px;
            box-shadow: 0 10px 30px rgba(14, 165, 233, 0.4);
          ">
            🌐 Live Demo: dent-flow-seven.vercel.app
          </div>
          <span style="font-size: 14px; color: #64748b;">
            Built & Engineered by Atharva • Ready for Production
          </span>
        </div>
      </div>
    `;
  });

  await sleep(3500);

  console.log('💾 Finishing video recording and closing browser...');
  await page.close();
  await context.close();
  await browser.close();

  console.log('✅ Recording complete! Video saved in walkthrough_video/');
}

run().catch((err) => {
  console.error('❌ Error recording walkthrough:', err);
  process.exit(1);
});
