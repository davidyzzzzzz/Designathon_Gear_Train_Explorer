/* helpers: numeric clamp + compact formatter */
const clampNum = (v, def=0) => isFinite(+v) ? +v : def;
const fmt = n => (isFinite(n)
  ? (Math.abs(n) > 1e5 || Math.abs(n) < 1e-3 ? n.toExponential(4) : n.toFixed(4))
      .replace(/\.0+$/,'').replace(/(\.\d*?)0+$/,'$1')
  : '–');

/* Simple Gear Train: build gear inputs */
function buildSingleGearList() {
  const n = Math.max(2, Math.floor(clampNum(document.getElementById('s_count').value, 2)));
  const box = document.getElementById('s_gear_list');
  box.innerHTML = '';
  for (let i = 1; i <= n; i++) {
    const wrap = document.createElement('div');

    const name = String.fromCharCode(64 + i);
    const lab = document.createElement('label');
    lab.innerHTML = `Gear ${name} teeth N<sub>${name}</sub>`;

    const inp = document.createElement('input');
    inp.type = 'number';
    inp.min = '1';
    inp.step = '1';
    inp.value = (i === 1 ? 18 : (i === n ? 54 : 30));
    inp.id = `s_Z_${i}`;

    wrap.appendChild(lab);
    wrap.appendChild(inp);
    box.appendChild(wrap);
  }
  box.addEventListener('input', singleCalc);
}


/* Simple Gear Train: compute results */
function singleCalc() {
  const n = Math.max(2, Math.floor(clampNum(document.getElementById('s_count').value, 2)));
  const inRPM = clampNum(document.getElementById('s_in_rpm').value, 0);
  const inT = clampNum(document.getElementById('s_in_torque').value, 0);

  const Z1 = clampNum(document.getElementById('s_Z_1').value, 1);
  const Zn = clampNum(document.getElementById(`s_Z_${n}`).value, 1);
  if (Z1<=0 || Zn<=0) return;

  const i = Zn / Z1;
  const meshes = n - 1;
  const reversed = meshes % 2 === 1;
  const outRPM = inRPM / i * (reversed ? -1 : 1);
  const outT = inT * i;

  document.getElementById('s_ratio').textContent = fmt(Math.abs(i));
  document.getElementById('s_out_rpm').textContent = fmt(outRPM);
  document.getElementById('s_out_torque').textContent = fmt(outT);
  document.getElementById('s_dir').textContent = reversed ? 'Reversed' : 'Same as input';
}

/* Compound Gear Train: two stages, common shaft */
function compoundCalc() {
  const Z1 = clampNum(document.getElementById('c_Z1').value, 1);
  const Z2 = clampNum(document.getElementById('c_Z2').value, 1);
  const Z3 = clampNum(document.getElementById('c_Z3').value, 1);
  const Z4 = clampNum(document.getElementById('c_Z4').value, 1);
  const inRPM = clampNum(document.getElementById('c_in_rpm').value, 0);
  const inT = clampNum(document.getElementById('c_in_torque').value, 0);

  if ([Z1, Z2, Z3, Z4].some(z => z <= 0)) return;

  let i = (Z2 / Z1) * (Z4 / Z3);
  const reversed = false;

  const outRPM = inRPM / i * (reversed ? -1 : 1);
  const outT = inT * Math.abs(i);

  document.getElementById('c_ratio').textContent = fmt(Math.abs(i));
  document.getElementById('c_out_rpm').textContent = fmt(outRPM);
  document.getElementById('c_out_torque').textContent = fmt(outT);
  document.getElementById('c_dir').textContent = 'Same as input';
}

/* Planetary Gear Train: Willis-based solver for 6 modes */
function planetaryCalc() {
  const Zs = clampNum(document.getElementById('p_Zs').value, 20);
  const Zr = clampNum(document.getElementById('p_Zr').value, 60);
  const mode = document.getElementById('p_mode').value;
  const inRPM = clampNum(document.getElementById('p_in_rpm').value, 0);
  const inT = clampNum(document.getElementById('p_in_torque').value, 0);

  if (Zs <= 0 || Zr <= 0 || Zr <= Zs) {
    document.getElementById('p_ratio').textContent = '–';
    document.getElementById('p_out_rpm').textContent = '–';
    document.getElementById('p_out_torque').textContent = '–';
    document.getElementById('p_dir').textContent = 'Check Ns < Nr';
    return;
  }

  const solveCarrier = (ws, wr) => (Zs*ws + Zr*wr) / (Zs + Zr);
  const ws_from_wr_wc = (wr, wc) => ((wr - wc) * (-Zr/Zs) + wc);
  const wr_from_ws_wc = (ws, wc) => (-Zs/Zr * (ws - wc) + wc);

  let win = 0, wout = 0, signDesc = '—';

  switch(mode) {
    case 'sun_in_ring_fixed_carrier_out': {
      const ws = inRPM, wr = 0; const wc = solveCarrier(ws, wr);
      win = ws; wout = wc; signDesc = (Math.sign(wout) === Math.sign(win)) ? 'Same as input' : 'Reversed'; break;
    }
    case 'ring_in_sun_fixed_carrier_out': {
      const wr = inRPM, ws = 0; const wc = solveCarrier(ws, wr);
      win = wr; wout = wc; signDesc = (Math.sign(wout) === Math.sign(win)) ? 'Same as input' : 'Reversed'; break;
    }
    case 'sun_in_carrier_fixed_ring_out': {
      const ws = inRPM, wc = 0; const wr = wr_from_ws_wc(ws, wc);
      win = ws; wout = wr; signDesc = (Math.sign(wout) === Math.sign(win)) ? 'Same as input' : 'Reversed'; break;
    }
    case 'carrier_in_ring_fixed_sun_out': {
      const wc = inRPM, wr = 0; const ws = ws_from_wr_wc(wr, wc);
      win = wc; wout = ws; signDesc = (Math.sign(wout) === Math.sign(win)) ? 'Same as input' : 'Reversed'; break;
    }
    case 'carrier_in_sun_fixed_ring_out': {
      const wc = inRPM, ws = 0; const wr = wr_from_ws_wc(ws, wc);
      win = wc; wout = wr; signDesc = (Math.sign(wout) === Math.sign(win)) ? 'Same as input' : 'Reversed'; break;
    }
    case 'ring_in_carrier_fixed_sun_out': {
      const wc = 0, wr = inRPM; const ws = ws_from_wr_wc(wr, wc);
      win = wr; wout = ws; signDesc = (Math.sign(wout) === Math.sign(win)) ? 'Same as input' : 'Reversed'; break;
    }
  }

  const ratioAbs = Math.abs(win / wout);
  const outRPM = wout;
  const outT = inT * ratioAbs;

  document.getElementById('p_ratio').textContent = isFinite(ratioAbs) ? fmt(ratioAbs) : '–';
  document.getElementById('p_out_rpm').textContent = isFinite(outRPM) ? fmt(outRPM) : '–';
  document.getElementById('p_out_torque').textContent = isFinite(outT) ? fmt(outT) : '–';
  document.getElementById('p_dir').textContent = signDesc;
}

/* bootstrap: wire events and run once */
function init() {
  buildSingleGearList();

  document.getElementById('s_count').addEventListener('input', () => { buildSingleGearList(); singleCalc(); });
  document.getElementById('s_in_rpm').addEventListener('input', singleCalc);
  document.getElementById('s_in_torque').addEventListener('input', singleCalc);

  ['c_Z1','c_Z2','c_Z3','c_Z4','c_in_rpm','c_in_torque'].forEach(id=>{
    const el = document.getElementById(id);
    if (el) { el.addEventListener('input', compoundCalc); el.addEventListener('change', compoundCalc); }
  });

  ['p_Zs','p_Zr','p_mode','p_in_rpm','p_in_torque'].forEach(id=>{
    const el = document.getElementById(id);
    if (el) { el.addEventListener('input', planetaryCalc); el.addEventListener('change', planetaryCalc); }
  });

  singleCalc(); compoundCalc(); planetaryCalc();
}
document.addEventListener('DOMContentLoaded', init);
