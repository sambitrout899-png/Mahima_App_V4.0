const { chromium } = require('../../backend/Mahima.Api.v3.clean/Scripts/DemoRenderer/node_modules/playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
(async () => {
  const browser = await chromium.launch({headless:true,channel:process.env.CHICKEN_TEST_BROWSER || "msedge"});
  const page = await browser.newPage({viewport:{width:1440,height:1100}});
  const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  const date = new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  let enabled=true; let commands=[];
  const day={date,version:1,city:'Jalandhar',rawFactor:1.6,targetMargin:20,expectedSalesKg:50,labor:300,rent:200,closed:false,countedRawKg:null,countedDressedKg:null,entries:[]};
  const totals={revenue:10000,profit:3100,soldKg:40,rawKg:20,rawValue:2000,dressedKg:10,dressedValue:1600,suggestedRate:213,breakEvenRate:170,costOfSales:6400,wasteCost:0,expenses:500,collected:9000,receivable:1000,supplierDue:500,cashFlow:1500,dressingLossKg:30,balances:[{id:'00000000-0000-4000-8000-000000000001',kind:'sale',party:'Customer A',due:1000}]};
  await page.route('**/*',async route=>{
    const u=new URL(route.request().url());
    if(u.pathname.endsWith('/today-updates/location')) return route.fulfill({json:{city:'Ludhiana',country:'India'}});
    if(u.pathname.includes('/chicken-sale/')){
      let result;
      if(u.pathname.endsWith('/access'))result={enabled,canAssign:true};
      else if(u.pathname.endsWith('/market'))result={city:'Jalandhar',price:130,asOf:'2026-09-07',fresh:false,sourceUrl:'https://www.indiaprices.co.in/chicken/jalandhar-chicken-price/',status:'Stale public quote â€” not today\'s price. Confirm with your supplier.'};
      else if(u.pathname.endsWith('/advice'))result={available:true,text:'Plan around your recorded costs. Verify the older market quote with your supplier.'};
      else if(u.pathname.endsWith('/days'))result=[{date,closed:false,totals}];
      else if(route.request().method()==='POST'){
        const command=route.request().postDataJSON();commands.push(command);
        if(command.action==='entry'){day.entries.push({...command.entry,createdAt:new Date().toISOString()});day.version++;}
        if(command.action==='edit-entry'){ const i=day.entries.findIndex(e=>e.id===command.entry.id);day.entries[i]={...day.entries[i],...command.entry};day.version++; }
        if(command.action==='settings' && ('countedRawKg' in command || 'countedDressedKg' in command)) return route.fulfill({status:400,json:{errors:{'$.countedRawKg':['Cannot convert null to decimal.']}}});
        if(command.action==='settings' && command.labor===777) return route.fulfill({status:400,json:{errors:{Labor:['Validation test: daily charge rejected.']}}});
        if(command.action==='settings') Object.assign(day,{city:command.city,rawFactor:command.rawFactor});
        if(command.action==='close'){day.closed=true;day.countedRawKg=command.countedRawKg;day.countedDressedKg=command.countedDressedKg;}
        result={day,totals};
      }else result={day,totals};
      return route.fulfill({json:result});
    }
    if(u.hostname!=='127.0.0.1' && u.hostname!=='localhost')return route.abort();
    return route.continue();
  });
  await page.goto('http://127.0.0.1:5179/tests/chicken-sale-preview.html');
  await page.getByRole('heading',{name:'Sell with your costs in view'}).waitFor();
  await page.getByText('Older quote',{exact:true}).waitFor();
  await page.screenshot({path:path.resolve('tmp/chicken-desktop.png'),fullPage:true});
  await page.getByRole('tab',{name:'entries',exact:true}).click();
  await page.getByLabel('Net weight (kg)').fill('10');
  await page.getByLabel('Supplier / invoice reference').fill('Test supplier');
  await page.getByLabel('Price per kg').fill('100');
  await page.getByRole('button',{name:'Set fully paid'}).click();
  await page.getByRole('button',{name:'Save entry',exact:true}).click();
  await page.getByText('Saved to the shop ledger.',{exact:true}).waitFor();
  assert.equal(commands[0].entry.paid,1000);
  assert.equal(commands[0].entry.kg,10);
  await page.getByLabel('Entry type').selectOption('collection');
  await page.getByLabel('Outstanding bill').selectOption('00000000-0000-4000-8000-000000000001');
  await page.getByLabel('Payment / expense amount').fill('100');
  await page.getByRole('button',{name:'Save entry',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('input[type=number]')?.value==='');
  assert.equal(commands[1].entry.referenceId,'00000000-0000-4000-8000-000000000001');
  await page.getByRole('button',{name:/Edit Receive raw chicken/}).click();
  assert.equal(await page.getByLabel('Net weight (kg)').inputValue(),'10');
  await page.getByLabel('Price per kg').fill('120');
  await page.getByLabel('Reason for edit').fill('Correct supplier rate');
  await page.getByRole('button',{name:'Save changes',exact:true}).click();
  await page.getByRole('button',{name:'Save entry',exact:true}).waitFor();
  assert.equal(commands[2].action,'edit-entry');
  assert.equal(commands[2].entry.id,commands[0].entry.id);
  assert.equal(commands[2].entry.rate,120);
  assert.equal(day.entries.length,2);
  await page.getByRole('tab',{name:'overview',exact:true}).click();
  await page.setViewportSize({width:390,height:844});
  await page.screenshot({path:path.resolve('tmp/chicken-mobile.png'),fullPage:true});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),'Mobile page must not overflow horizontally');
  await page.context().grantPermissions(['geolocation']);
  await page.context().setGeolocation({latitude:30.9,longitude:75.85});
  await page.getByRole('tab',{name:'settings',exact:true}).click();
  await page.getByRole('button',{name:'Use device location'}).click();
  await page.getByText('Detected Ludhiana. Review and save your daily settings.',{exact:true}).waitFor();
  assert.equal(await page.getByLabel('Shop city (English)').inputValue(),'Ludhiana');
  await page.getByRole('button',{name:'Save daily settings'}).click();
  await page.getByText('Saved to the shop ledger.',{exact:true}).waitFor();
  assert.equal(commands[3].city,'Ludhiana');
  await page.getByLabel('Daily labor charge').fill('777');
  await page.getByRole('button',{name:'Save daily settings'}).click();
  await page.getByRole('alert').filter({hasText:'Labor: Validation test: daily charge rejected.'}).waitFor();
  await page.getByRole('tab',{name:'close day',exact:true}).click();
  await page.getByLabel('Physical raw closing weight').fill('20');
  await page.getByLabel('Physical dressed closing weight').fill('10');
  await page.getByRole('checkbox').check();
  await page.getByRole('button',{name:'Close & carry forward stock'}).click();
  await page.getByRole('heading',{name:'Day closed & reconciled'}).waitFor();
  await page.getByRole('tab',{name:'entries',exact:true}).click();
  assert.equal(await page.getByRole('button',{name:'Day is closed'}).isDisabled(),true);
  enabled=false;await page.reload();
  await page.getByText('This module is assigned individually.',{exact:false}).waitFor();
  assert.deepEqual(errors,[]);
  await browser.close();console.log('Passed: desktop/mobile rendering, receipt, balance collection, close lock, device location, denied access, no browser errors.');
})().catch(e=>{console.error(e);process.exit(1)});

