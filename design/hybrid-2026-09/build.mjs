import { writeFileSync } from "node:fs";

const STYLE = `
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Roboto+Slab:wght@500;600;700&family=Roboto:wght@400;500;700;800&display=swap">
  <style>
    :root{
      --navy:#0d1b38;--navy-soft:#152747;
      --mint:#3abd9d;--mint-dark:#169276;--mint-text:#037f63;
      --teal:#165d64;--green-light:#e7f8f3;
      --ink:#172332;--muted:#65717f;--line:#e4e7e4;
      --surface:#ffffff;--cream:#faf6ee;--warm:#fff7ec;
      --warning:#bb7623;--warning-bg:#fff4e2;--warning-text:#a5600d;
      --danger:#a34b4b;--danger-bg:#fbeeee;--danger-line:#e7c4c4;
      --blue-bg:#eaf1fa;--blue-text:#315d91;
      --radius:18px;--shadow-card:0 8px 28px rgba(13,27,56,.05);
      --serif:"Roboto Slab",Georgia,"Times New Roman",serif;
      --sans:"Roboto",-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;
    }
    *{box-sizing:border-box;}
    body{margin:0;background:var(--cream);color:var(--ink);font-family:var(--sans);-webkit-font-smoothing:antialiased;}
    a{color:var(--teal);text-decoration:none;} a:hover{color:var(--mint-text);}
    h1,h2,h3,h4{font-family:var(--serif);letter-spacing:-.01em;margin:0;}
    p{margin:0;}
    .shell{position:relative;display:grid;grid-template-columns:250px minmax(0,1fr);min-height:__H__px;}
    .shell.login{display:block;min-height:__H__px;background:radial-gradient(circle at 14% 14%,rgba(58,189,157,.20),transparent 30%),radial-gradient(circle at 86% 84%,rgba(22,93,100,.22),transparent 32%),var(--navy);}

    .side{display:flex;flex-direction:column;background:radial-gradient(circle at 0 0,rgba(58,189,157,.18),transparent 44%),var(--navy);color:#fff;padding:26px 18px 22px;}
    .brand{display:flex;align-items:center;gap:12px;}
    .brand .logo{display:grid;place-items:center;width:38px;height:38px;border-radius:10px;background:var(--mint);color:var(--navy);font-family:var(--serif);font-weight:700;font-size:20px;}
    .brand .name{font-family:var(--serif);font-weight:600;font-size:17px;line-height:1;}
    .brand .name small{display:block;font-family:var(--sans);font-size:9.5px;font-weight:700;letter-spacing:.16em;color:#9fb1c2;margin-top:5px;}
    .nav{display:flex;flex-direction:column;gap:4px;margin-top:40px;flex:1;}
    .nav a{display:flex;align-items:center;gap:12px;min-height:44px;padding:0 13px;border-radius:11px;color:#aab8c6;font-size:13.5px;font-weight:500;}
    .nav a svg{width:18px;height:18px;flex:0 0 auto;stroke:currentColor;fill:none;stroke-width:1.7;}
    .nav a:hover{background:rgba(255,255,255,.06);color:#fff;}
    .nav a.on{background:rgba(58,189,157,.16);color:#fff;font-weight:700;}
    .nav a .tag{margin-left:auto;display:inline-flex;gap:4px;}
    .nav a .tag span{min-width:20px;text-align:center;border-radius:999px;background:var(--warning);color:#fff;font-size:10.5px;font-weight:800;padding:1px 6px;}
    .nav a .tag span.g{background:var(--mint);color:var(--navy);}
    .side-foot{display:grid;gap:14px;}
    .user{display:flex;align-items:center;gap:10px;}
    .user .av{display:grid;place-items:center;width:36px;height:36px;border-radius:10px;background:var(--mint);color:var(--navy);font-weight:800;font-size:12px;}
    .user strong{display:block;font-size:12.5px;}
    .user small{display:block;color:#93a5b6;font-size:10.5px;margin-top:2px;}
    .logout{display:flex;align-items:center;gap:8px;border:0;background:transparent;color:#9fb1c2;font:inherit;font-size:11px;padding:0 0 3px;cursor:pointer;border-bottom:1px solid rgba(255,255,255,.18);width:fit-content;}
    .logout svg{width:13px;height:13px;stroke:currentColor;fill:none;stroke-width:1.8;}

    .main{min-width:0;}
    .top{position:sticky;top:0;z-index:5;display:flex;align-items:center;justify-content:space-between;gap:22px;min-height:88px;padding:18px 34px;background:rgba(250,246,238,.92);border-bottom:1px solid var(--line);backdrop-filter:blur(10px);}
    .eyebrow{color:var(--mint-text);font-size:10px;font-weight:800;letter-spacing:.15em;text-transform:uppercase;}
    .top h1{font-size:30px;margin-top:3px;}
    .top-actions{display:flex;align-items:center;gap:12px;}
    .period{display:flex;align-items:center;gap:4px;min-height:46px;border:1px solid var(--line);border-radius:12px;background:var(--surface);box-shadow:0 5px 18px rgba(13,27,56,.04);padding:0 6px;}
    .period button{width:30px;height:30px;border:0;border-radius:8px;background:transparent;cursor:pointer;display:grid;place-items:center;}
    .period button svg{width:16px;height:16px;stroke:var(--muted);fill:none;stroke-width:2;}
    .period .val{display:flex;flex-direction:column;padding:4px 8px;min-width:150px;}
    .period .val small{color:var(--muted);font-size:8px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;}
    .period .val strong{display:flex;align-items:center;gap:8px;font-size:13px;font-weight:800;color:var(--navy);}
    .period .val strong svg{width:11px;height:11px;stroke:var(--muted);fill:none;stroke-width:2.4;margin-left:auto;}
    .pill{display:inline-flex;align-items:center;gap:7px;border:1px solid #bfe6da;border-radius:999px;background:var(--green-light);color:var(--mint-text);font-size:10px;font-weight:800;padding:8px 12px;white-space:nowrap;}
    .pill svg{width:12px;height:12px;stroke:currentColor;fill:none;stroke-width:2;}
    .badge{border:1px solid #8fd7c4;border-radius:999px;background:#e3f7f1;color:#087a62;font-size:9px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;padding:7px 10px;white-space:nowrap;}
    .badge.test{border-color:#e6b66a;background:#fff4df;color:#8b5200;}
    .icon-btn{width:42px;height:42px;border:1px solid var(--line);border-radius:12px;background:var(--surface);display:grid;place-items:center;cursor:pointer;position:relative;}
    .icon-btn svg{width:18px;height:18px;stroke:var(--ink);fill:none;stroke-width:1.7;}
    .icon-btn .dot{position:absolute;top:8px;right:9px;width:7px;height:7px;border-radius:50%;background:var(--warning);}
    .top-av{width:40px;height:40px;border-radius:11px;background:var(--navy);color:#fff;display:grid;place-items:center;font-weight:800;font-size:13px;}

    .wrap{padding:22px 34px 46px;}
    .view-head{display:flex;align-items:flex-end;justify-content:space-between;gap:24px;margin:6px 0 20px;}
    .view-head h2{font-size:32px;letter-spacing:-.02em;}
    .view-head p{max-width:620px;margin-top:8px;color:var(--muted);font-size:13px;line-height:1.55;}
    .head-actions{display:flex;flex-wrap:wrap;gap:9px;justify-content:flex-end;}

    .btn-primary{display:inline-flex;align-items:center;gap:8px;border:0;border-radius:11px;background:var(--mint);color:var(--navy);font:inherit;font-size:12.5px;font-weight:800;padding:11px 17px;cursor:pointer;box-shadow:0 8px 18px rgba(58,189,157,.2);}
    .btn-primary svg{width:14px;height:14px;stroke:var(--navy);fill:none;stroke-width:2.4;}
    .btn-ghost{display:inline-flex;align-items:center;gap:8px;border:1px solid var(--line);border-radius:11px;background:var(--surface);color:var(--navy);font:inherit;font-size:12.5px;font-weight:700;padding:11px 16px;cursor:pointer;}
    .btn-ghost svg{width:14px;height:14px;stroke:currentColor;fill:none;stroke-width:2;}

    .panel{border:1px solid var(--line);border-radius:var(--radius);background:var(--surface);box-shadow:var(--shadow-card);overflow:hidden;}
    .panel + .panel{margin-top:18px;}
    .panel-head{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;padding:22px 24px 14px;}
    .panel-head h3{font-size:19px;}
    .panel-head p{margin-top:6px;color:var(--muted);font-size:10.5px;}

    .kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;}
    .kpi{border:1px solid var(--line);border-radius:14px;background:var(--surface);padding:16px 17px;box-shadow:0 5px 18px rgba(13,27,56,.03);}
    .kpi .lbl{color:var(--muted);font-size:9.5px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;}
    .kpi .v{display:flex;align-items:baseline;gap:8px;margin-top:9px;}
    .kpi .v strong{font-family:var(--serif);font-size:26px;color:var(--navy);}
    .kpi .v span{font-size:12px;font-weight:800;color:var(--mint-text);}
    .kpi .v span.warn{color:var(--warning-text);} .kpi .v span.mut{color:var(--muted);} .kpi .v span.dgr{color:var(--danger);}

    .tbl{width:100%;border-collapse:separate;border-spacing:0 8px;padding:0 16px 8px;}
    .tbl th{color:var(--muted);font-size:9px;letter-spacing:.07em;text-transform:uppercase;text-align:left;padding:6px 14px;font-weight:800;}
    .tbl td{background:var(--warm);border-top:1px solid var(--line);border-bottom:1px solid var(--line);padding:15px 14px;font-size:12px;vertical-align:middle;}
    .tbl td:first-child{border-left:1px solid var(--line);border-radius:12px 0 0 12px;}
    .tbl td:last-child{border-right:1px solid var(--line);border-radius:0 12px 12px 0;text-align:right;}
    .tbl tr.warm td{background:#fff7ec;border-color:#edd6b3;}
    .tbl tr.plain td{background:var(--surface);}
    .who{display:flex;align-items:center;gap:10px;}
    .who .av{display:grid;place-items:center;width:34px;height:34px;border-radius:10px;background:var(--green-light);color:var(--teal);font-size:10px;font-weight:800;}
    .who strong{display:block;color:var(--navy);font-size:12px;}
    .who small{display:block;color:var(--muted);font-size:9.5px;margin-top:2px;}
    .cell strong{display:block;color:var(--navy);font-size:12px;}
    .cell small{display:block;color:var(--muted);font-size:9.5px;margin-top:3px;}
    .sp{display:inline-flex;align-items:center;min-height:24px;border-radius:999px;font-size:9px;font-weight:800;padding:4px 10px;letter-spacing:.02em;}
    .sp.ok{background:var(--green-light);color:var(--mint-text);}
    .sp.sub{background:var(--blue-bg);color:var(--blue-text);}
    .sp.grey{background:#f1f3f2;color:var(--muted);}
    .sp.warn{background:var(--warning-bg);color:var(--warning-text);}
    .sp.dgr{background:var(--danger-bg);color:var(--danger);}
    .mini-btn{border:1px solid var(--line);border-radius:9px;background:var(--surface);color:var(--teal);font:inherit;font-size:10px;font-weight:800;padding:8px 11px;cursor:pointer;}
    .kebab{width:30px;height:30px;border:1px solid var(--line);border-radius:8px;background:var(--surface);display:inline-grid;place-items:center;cursor:pointer;vertical-align:middle;}
    .kebab svg{width:15px;height:15px;stroke:var(--muted);fill:none;stroke-width:2;}

    .legend{display:flex;gap:22px;align-items:center;padding:14px 24px 20px;border-top:1px solid var(--line);}
    .legend span{display:flex;align-items:center;gap:8px;color:var(--muted);font-size:10.5px;font-weight:700;}
    .legend i{width:9px;height:9px;border-radius:50%;display:inline-block;}
    .legend i.g{background:var(--mint-dark);} .legend i.o{background:var(--warning);} .legend i.n{background:#c4cbc9;}

    .toolbar{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:16px 22px;border-bottom:1px solid var(--line);}
    .search{display:flex;align-items:center;gap:8px;border:1px solid var(--line);border-radius:10px;background:var(--surface);padding:0 12px;min-width:300px;}
    .search svg{width:15px;height:15px;stroke:var(--muted);fill:none;stroke-width:2;}
    .search input{border:0;outline:0;background:transparent;font:inherit;font-size:11.5px;padding:10px 0;width:100%;color:var(--ink);}
    .filters{display:flex;gap:7px;}
    .filters button{border:1px solid var(--line);border-radius:999px;background:var(--surface);color:var(--muted);font:inherit;font-size:10px;font-weight:800;padding:7px 12px;cursor:pointer;}
    .filters button.on{border-color:var(--mint-dark);background:var(--green-light);color:var(--mint-text);}
    .pager{display:flex;align-items:center;justify-content:flex-end;gap:12px;padding:14px 22px;border-top:1px solid var(--line);color:var(--muted);font-size:11px;}
    .pager .pages{display:flex;gap:5px;}
    .pager .pages button{width:30px;height:30px;border:1px solid var(--line);border-radius:8px;background:var(--surface);color:var(--ink);font:inherit;font-size:11px;font-weight:700;cursor:pointer;}
    .pager .pages button.on{border-color:var(--mint-dark);background:var(--mint);color:var(--navy);}
    .pager .pages button svg{stroke:var(--ink);fill:none;stroke-width:2;vertical-align:middle;}
    .pager select{border:1px solid var(--line);border-radius:8px;background:var(--surface);font:inherit;padding:6px 8px;color:var(--ink);}

    .overlay{position:absolute;inset:0;background:rgba(13,27,56,.42);backdrop-filter:blur(2px);display:flex;align-items:flex-start;justify-content:center;padding:64px 24px;}
    .dialog{width:min(760px,100%);background:var(--surface);border-radius:20px;box-shadow:0 40px 90px rgba(0,0,0,.32);overflow:hidden;}
    .dialog-head{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;padding:24px 26px 18px;}
    .dialog-head h3{font-size:22px;}
    .dialog-head p{margin-top:5px;color:var(--muted);font-size:12px;}
    .x{width:34px;height:34px;border:0;border-radius:10px;background:#f1f3f2;display:grid;place-items:center;cursor:pointer;}
    .x svg{width:16px;height:16px;stroke:var(--muted);fill:none;stroke-width:2;}
    .dialog-body{padding:0 26px 8px;}
    .dialog-foot{display:flex;justify-content:flex-end;gap:10px;padding:18px 26px 24px;border-top:1px solid var(--line);margin-top:18px;}

    .stepper{display:flex;align-items:center;gap:0;padding:8px 0 22px;}
    .stepper .st{display:flex;align-items:center;gap:11px;}
    .stepper .st .dot{width:34px;height:34px;border-radius:50%;border:1px solid var(--line);background:var(--surface);display:grid;place-items:center;color:var(--muted);font-size:12px;font-weight:800;}
    .stepper .st .dot svg{stroke:#fff;fill:none;stroke-width:2.4;}
    .stepper .st.done .dot{border-color:var(--mint-dark);background:var(--mint-dark);color:#fff;}
    .stepper .st .lbl{font-size:11px;font-weight:800;color:var(--muted);}
    .stepper .st.done .lbl{color:var(--navy);}
    .stepper .line{flex:1;height:2px;background:var(--line);margin:0 12px;min-width:36px;}
    .stepper .line.done{background:var(--mint-dark);}

    .doc-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;}
    .doc{border:1px solid var(--line);border-radius:14px;background:var(--surface);padding:16px;}
    .doc.present{border-color:#bce7dc;}
    .doc.missing{border-color:#efc98d;}
    .doc header{display:flex;align-items:center;gap:12px;border-bottom:1px solid var(--line);padding-bottom:12px;}
    .doc header .ic{width:32px;height:32px;border-radius:9px;background:var(--green-light);display:grid;place-items:center;}
    .doc header .ic svg{width:16px;height:16px;stroke:var(--teal);fill:none;stroke-width:1.8;}
    .doc header strong{font-size:13px;color:var(--navy);flex:1;}
    .doc .body{padding-top:12px;display:grid;gap:11px;}
    .doc .body p{color:var(--muted);font-size:11px;line-height:1.5;}
    .doc dl{display:grid;gap:7px;margin:0;border-top:1px solid var(--line);padding-top:11px;}
    .doc dl div{display:grid;grid-template-columns:64px minmax(0,1fr);gap:10px;}
    .doc dt{color:var(--muted);font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.04em;}
    .doc dd{margin:0;color:var(--navy);font-size:10.5px;font-weight:800;}
    .danger-box{margin-top:14px;border:1px solid var(--danger-line);border-radius:12px;background:var(--danger-bg);padding:14px 16px;display:flex;gap:12px;align-items:flex-start;}
    .danger-box svg{width:17px;height:17px;stroke:var(--danger);fill:none;stroke-width:2;flex:0 0 auto;margin-top:1px;}
    .danger-box strong{display:block;color:var(--danger);font-size:12.5px;}
    .danger-box small{display:block;color:#8a4a4a;font-size:10.5px;margin-top:3px;line-height:1.5;}
    .btn-danger{border:1px solid #c98d8d;border-radius:10px;background:var(--surface);color:var(--danger);font:inherit;font-size:11px;font-weight:800;padding:9px 13px;cursor:pointer;white-space:nowrap;}

    .cards{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;}
    .ecard{border:1px solid var(--line);border-radius:16px;background:var(--surface);padding:18px 20px;box-shadow:0 5px 18px rgba(13,27,56,.03);}
    .ecard.warm{border-color:#edd6b3;background:linear-gradient(150deg,#fff,#fff7ec);}
    .ecard .top-row{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;}
    .ecard .who strong{font-size:13px;}
    .ecard .grid3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:16px;}
    .ecard .field{border:1px solid var(--line);border-radius:10px;background:var(--warm);padding:10px 11px;}
    .ecard .field span{display:block;color:var(--muted);font-size:8.5px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;}
    .ecard .field strong{display:block;color:var(--navy);font-size:12px;margin-top:5px;}
    .ecard .row-actions{display:flex;gap:8px;margin-top:16px;}

    .settings-grid{display:grid;grid-template-columns:220px minmax(0,1fr);gap:20px;}
    .settings-nav{display:flex;flex-direction:column;gap:3px;}
    .settings-nav a{padding:10px 13px;border-radius:10px;color:var(--muted);font-size:12px;font-weight:700;}
    .settings-nav a.on{background:var(--surface);border:1px solid var(--line);color:var(--navy);box-shadow:var(--shadow-card);}
    .field-row{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:16px;}
    .field-row.one{grid-template-columns:minmax(0,1fr);}
    .form-field{display:grid;gap:6px;}
    .form-field label{font-size:10px;font-weight:800;color:var(--navy);text-transform:uppercase;letter-spacing:.04em;}
    .form-field input,.form-field select,.form-field textarea{border:1px solid var(--line);border-radius:10px;background:var(--surface);font:inherit;font-size:12px;padding:11px 12px;color:var(--ink);width:100%;}
    .form-field .hint{color:var(--muted);font-size:10px;line-height:1.45;}
    .toggle{display:flex;align-items:center;gap:12px;padding:14px 0;border-top:1px solid var(--line);}
    .toggle:first-of-type{border-top:0;}
    .toggle .sw{width:40px;height:23px;border-radius:999px;background:var(--mint);position:relative;flex:0 0 auto;}
    .toggle .sw::after{content:"";position:absolute;top:2px;right:2px;width:19px;height:19px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.25);}
    .toggle .sw.off{background:#d3d8d6;}
    .toggle .sw.off::after{right:auto;left:2px;}
    .toggle .txt strong{display:block;font-size:12.5px;color:var(--navy);}
    .toggle .txt small{display:block;color:var(--muted);font-size:10.5px;margin-top:3px;line-height:1.45;}

    .hours-table{width:100%;border-collapse:collapse;}
    .hours-table th,.hours-table td{border:1px solid var(--line);padding:11px 10px;font-size:11.5px;text-align:center;}
    .hours-table th{background:var(--warm);color:var(--muted);font-size:9px;text-transform:uppercase;letter-spacing:.05em;font-weight:800;}
    .hours-table td.day{text-align:left;color:var(--navy);font-weight:700;background:#fdfaf4;}
    .hours-table td input{width:52px;border:1px solid var(--line);border-radius:7px;background:var(--surface);font:inherit;font-size:12px;text-align:center;padding:6px 4px;color:var(--ink);}
    .hours-table tr.tot td{background:var(--green-light);font-weight:800;color:var(--mint-text);}
    .week-tabs{display:flex;gap:6px;}
    .week-tabs button{border:1px solid var(--line);border-radius:9px;background:var(--surface);color:var(--muted);font:inherit;font-size:10.5px;font-weight:800;padding:8px 12px;cursor:pointer;}
    .week-tabs button.on{border-color:var(--mint-dark);background:var(--green-light);color:var(--mint-text);}
    .stat-strip{display:flex;gap:22px;flex-wrap:wrap;padding:16px 22px;border-top:1px solid var(--line);}
    .stat-strip div span{display:block;color:var(--muted);font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;}
    .stat-strip div strong{display:block;font-family:var(--serif);font-size:19px;color:var(--navy);margin-top:4px;}

    .banner{display:flex;align-items:center;gap:12px;border:1px solid #edd6b3;border-left:4px solid var(--warning);border-radius:12px;background:var(--warning-bg);padding:14px 16px;margin-bottom:16px;}
    .banner svg{width:17px;height:17px;stroke:var(--warning-text);fill:none;stroke-width:2;flex:0 0 auto;}
    .banner strong{display:block;font-size:12px;color:var(--warning-text);}
    .banner small{display:block;color:#8a5a1e;font-size:10.5px;margin-top:2px;}

    /* login */
    .login-panel{width:min(560px,100%);margin:0 auto;background:var(--surface);border-radius:24px;box-shadow:0 30px 80px rgba(0,0,0,.28);padding:44px;}
    .login-panel .brandbar{display:flex;align-items:center;gap:14px;padding-bottom:20px;margin-bottom:26px;border-bottom:1px solid var(--line);}
    .login-panel .brandbar .logo{width:44px;height:44px;font-size:22px;}
    .login-panel .brandbar b{font-family:var(--serif);font-size:19px;color:var(--navy);}
    .login-panel .env{display:inline-block;border:1px solid #8fd7c4;border-radius:999px;background:var(--green-light);color:var(--mint-text);font-size:9px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;padding:5px 10px;}
    .login-panel h1{font-family:var(--serif);font-size:34px;color:var(--navy);margin:14px 0 10px;letter-spacing:-.02em;}
    .login-panel .intro{color:var(--muted);font-size:12.5px;line-height:1.6;}
    .login-form{display:grid;gap:14px;margin-top:26px;}
    .login-form .form-field input{padding:13px 13px;}
    .login-form .btn-primary{width:100%;justify-content:center;padding:15px;font-size:13.5px;margin-top:4px;}
    .login-form .forgot{justify-self:center;color:var(--navy);font-size:11px;text-decoration:underline;text-underline-offset:3px;}
    .login-foot{display:flex;justify-content:space-between;gap:16px;margin-top:24px;border-top:1px solid var(--line);padding-top:16px;color:var(--muted);font-size:9.5px;}
  </style>`;

const ICONS = {
  home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>',
  check: '<path d="M20 6L9 17l-5-5"/>',
  file: '<path d="M14 3H6v18h12V8z"/><path d="M14 3v5h4"/>',
  chat: '<path d="M4 4h16v12H8l-4 4z"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-8 0v2"/><circle cx="12" cy="7" r="4"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 13a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z"/>',
  chart: '<path d="M4 20V10"/><path d="M10 20V4"/><path d="M16 20v-7"/><path d="M22 20H2"/>',
  bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>',
  left: '<path d="M15 18l-6-6 6-6"/>',
  right: '<path d="M9 6l6 6-6 6"/>',
  down: '<path d="M6 9l6 6 6-6"/>',
  refresh: '<path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/>',
  arrow: '<path d="M5 12h14"/><path d="M13 6l6 6-6 6"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
  x: '<path d="M18 6L6 18"/><path d="M6 6l12 12"/>',
  doc: '<path d="M14 3H6v18h12V8z"/><path d="M14 3v5h4"/><path d="M9 13h6"/><path d="M9 17h6"/>',
  undo: '<path d="M3 7v6h6"/><path d="M3 13a9 9 0 1 0 3-7.7L3 8"/>',
  warn: '<path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.3 3.9l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3l-8-14a2 2 0 0 0-3.4 0z"/>',
  plus: '<path d="M12 5v14"/><path d="M5 12h14"/>',
  logout: '<path d="M9 21H5V3h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/>',
  export: '<path d="M12 15V3"/><path d="M7 8l5-5 5 5"/><path d="M20 21H4"/>',
};
const ic = (n, w = 24) => `<svg viewBox="0 0 24 24" width="${w}" height="${w}">${ICONS[n]}</svg>`;

function sidebar(active) {
  const items = [
    ["home", "Dashboard", "dashboard", '<span class="tag"><span>2</span><span class="g">11</span></span>'],
    ["clock", "Uren", "uren", ""],
    ["check", "Goedkeuringen", "goedkeuringen", '<span class="tag"><span>1</span></span>'],
    ["file", "Facturen", "facturen", '<span class="tag"><span>1</span></span>'],
    ["doc", "Klanturenstaten", "klanturenstaten", ""],
    ["chat", "Mededelingen", "mededelingen", ""],
    ["users", "Medewerkers", "medewerkers", ""],
    ["gear", "Instellingen", "instellingen", ""],
  ];
  return `<aside class="side">
    <div class="brand"><span class="logo">P</span><span class="name">Path<small>UREN &amp; FACTURATIE</small></span></div>
    <nav class="nav">
      ${items.map(([i, l, k, t]) => `<a class="${k === active ? "on" : ""}" href="#">${ic(i)}${l}${t}</a>`).join("\n      ")}
    </nav>
    <div class="side-foot">
      <div class="user"><span class="av">GM</span><span><strong>Gio Maatsen</strong><small>Beheerder</small></span></div>
      <button class="logout">${ic("logout", 13)}Uitloggen</button>
    </div>
  </aside>`;
}

function topbar(title, { period = "September 2026", pill = true, badge = "test", bell = true } = {}) {
  return `<header class="top">
    <div><p class="eyebrow">Path Consultancy</p><h1>${title}</h1></div>
    <div class="top-actions">
      <div class="period"><button>${ic("left", 16)}</button><span class="val"><small>Maanddetail</small><strong>${period}${ic("down", 11)}</strong></span><button>${ic("right", 16)}</button></div>
      ${pill ? `<span class="pill">${ic("refresh", 12)}Actuele maand bij inloggen</span>` : ""}
      ${badge === "test" ? `<span class="badge test">Testomgeving</span><span class="badge">Test-mail actief</span>` : ""}
      ${bell ? `<button class="icon-btn"><span class="dot"></span>${ic("bell", 18)}</button>` : ""}
      <span class="top-av">GM</span>
    </div>
  </header>`;
}

function page(name, { active, title, height, body, topOpts, login }) {
  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>${STYLE.replace(/__H__/g, String(height))}</helmet>
${login ? `<div class="shell login">${body}</div>` : `<div class="shell">
  ${sidebar(active)}
  <div class="main">
    ${topbar(title, topOpts || {})}
    <div class="wrap">
${body}
    </div>
  </div>
</div>`}
</x-dc>
</body>
</html>`;
  writeFileSync(new URL(`./${name}.dc.html`, import.meta.url), html);
  console.log("wrote", name);
}

/* ---------- MAIN — ADMIN DASHBOARD ---------- */
page("Main", {
  active: "dashboard", title: "Dashboard", height: 1200,
  body: `<section class="panel" style="border:0;box-shadow:none;background:transparent;overflow:visible;">
  <div style="display:grid;grid-template-columns:minmax(0,1.4fr) minmax(280px,.6fr);gap:30px;align-items:center;border-radius:16px;background:linear-gradient(118deg,#0d1b38 0%,#102746 60%,#164b57 100%);color:#fff;padding:30px 34px;box-shadow:0 14px 34px rgba(13,27,56,.16);">
    <div>
      <p class="eyebrow" style="color:#7fd8c4;">Maandafsluiting</p>
      <h2 style="font-size:34px;margin:8px 0 10px;">Goedenavond, Gio</h2>
      <p style="color:#d3dde4;font-size:14px;line-height:1.55;max-width:560px;">13 open acties in 10 dossiers over 4 maanden. Begin bij Backoffice; de rest wacht op medewerkers.</p>
      <div style="display:flex;flex-wrap:wrap;gap:9px;margin-top:18px;">
        <span style="border:1px solid rgba(255,255,255,.16);border-radius:999px;background:rgba(0,0,0,.22);color:#eaf1f4;font-size:11px;font-weight:700;padding:7px 13px;">7 bij Backoffice</span>
        <span style="border:1px solid rgba(255,255,255,.16);border-radius:999px;background:rgba(255,255,255,.07);color:#eaf1f4;font-size:11px;font-weight:700;padding:7px 13px;">12 wachten op medewerkers</span>
      </div>
      <button class="btn-primary" style="margin-top:18px;">Bekijk alle 13 open acties ${ic("arrow", 14)}</button>
    </div>
    <div style="display:grid;gap:11px;border:1px solid rgba(255,255,255,.18);border-radius:12px;background:rgba(255,255,255,.06);padding:18px;">
      <span style="color:#b9c7d4;font-size:10px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;">Open werkvoorraad</span>
      <span style="font-family:var(--serif);font-size:25px;">13 open acties</span>
      <div style="display:grid;gap:3px;border-top:1px solid rgba(255,255,255,.12);padding-top:10px;"><small style="color:#b9c7d4;font-size:10px;">Per maand</small><b style="font-size:12px;line-height:1.45;">Juni 2 + Juli 2 + Augustus 2 + September 7 = 13</b></div>
      <div style="display:grid;gap:3px;border-top:1px solid rgba(255,255,255,.12);padding-top:10px;"><small style="color:#b9c7d4;font-size:10px;">Per eigenaar</small><b style="font-size:12px;line-height:1.45;">Backoffice 2 + wacht op medewerkers 11 = 13</b></div>
    </div>
  </div>
  </section>

  <div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(240px,auto);gap:26px;align-items:center;margin-top:16px;border:1px solid var(--line);border-left:4px solid var(--mint-dark);border-radius:12px;background:var(--surface);padding:18px 24px;box-shadow:var(--shadow-card);">
    <div>
      <span style="color:var(--mint-text);font-size:9.5px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;">Volgende actie · 1 van 7 bij Backoffice</span>
      <h3 style="font-size:20px;margin:6px 0 7px;">Verzending controleren</h3>
      <div style="display:flex;flex-wrap:wrap;gap:8px;color:var(--ink);font-size:11px;"><span>Brian Hek</span><span style="color:var(--muted);">·</span><span>Augustus 2026</span><span style="color:var(--muted);">·</span><span>COA / Itaq</span></div>
      <small style="display:block;margin-top:7px;color:var(--muted);font-size:11px;line-height:1.5;">De afzonderlijke factuur- en salarisroutes staan klaar voor controle.</small>
    </div>
    <div style="display:grid;justify-items:end;gap:9px;text-align:right;">
      <small style="color:var(--muted);font-size:11px;">Daarna nog 6 bij Backoffice</small>
      <button class="btn-primary">Start deze actie ${ic("arrow", 14)}</button>
    </div>
  </div>

  <div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;margin-top:16px;">
    <div style="border:1px solid var(--line);border-radius:12px;background:var(--surface);padding:20px;min-height:126px;"><span style="color:var(--muted);font-size:11px;font-weight:600;">Uren ingediend</span><span style="display:block;margin:10px 0 8px;font-family:var(--serif);font-size:28px;color:var(--navy);">1<small style="color:#9aa4ae;font-size:15px;font-family:var(--sans);font-weight:700;"> / 1</small></span><span style="color:var(--muted);font-size:11px;">Iedereen heeft September 2026 ingediend</span></div>
    <div style="border:1px solid var(--line);border-radius:12px;background:var(--surface);padding:20px;min-height:126px;"><span style="color:var(--muted);font-size:11px;font-weight:600;">Goedgekeurd</span><span style="display:block;margin:10px 0 8px;font-family:var(--serif);font-size:28px;color:var(--navy);">0<small style="color:#9aa4ae;font-size:15px;font-family:var(--sans);font-weight:700;"> / 1</small></span><span style="color:var(--muted);font-size:11px;">1 wacht op controle</span></div>
    <div style="border:1px solid var(--line);border-radius:12px;background:var(--surface);padding:20px;min-height:126px;"><span style="color:var(--muted);font-size:11px;font-weight:600;">Facturen klaar</span><span style="display:block;margin:10px 0 8px;font-family:var(--serif);font-size:28px;color:var(--navy);">€ 0</span><span style="color:var(--muted);font-size:11px;">Exclusief btw</span></div>
    <div style="border:1px solid #efddc7;border-radius:12px;background:linear-gradient(150deg,#fff,#fff8ef);padding:20px;min-height:126px;"><span style="color:var(--muted);font-size:11px;font-weight:600;">Acties bij Backoffice</span><span style="display:block;margin:10px 0 8px;font-family:var(--serif);font-size:28px;color:var(--navy);">2</span><span style="color:var(--muted);font-size:11px;">11 acties wachten op medewerkers</span></div>
  </div>

  <div class="panel" style="margin-top:18px;">
    <div class="panel-head"><div><p class="eyebrow" style="color:var(--muted);">Zonder maanden wisselen</p><h3>Teamstatus · September 2026</h3><p>5 medewerkers · 1 te controleren · 4 wachten op medewerkers</p></div><a href="#">Bekijk teamstatus</a></div>
    <div class="kpis" style="padding:4px 24px 18px;">
      <div class="kpi" style="background:var(--warm);"><span class="lbl">Uren ingediend</span><span class="v"><strong>1</strong><span>20%</span></span></div>
      <div class="kpi" style="background:var(--warm);"><span class="lbl">Goedgekeurd</span><span class="v"><strong>0</strong><span class="mut">0%</span></span></div>
      <div class="kpi" style="background:var(--warm);"><span class="lbl">Klanturenstaat binnen</span><span class="v"><strong>1</strong><span class="warn">20%</span></span></div>
      <div class="kpi" style="background:var(--warm);"><span class="lbl">Facturen aangemaakt</span><span class="v"><strong>0</strong><span class="mut">0%</span></span></div>
    </div>
    <table class="tbl">
      <thead><tr><th>Medewerker</th><th>Klant / opdracht</th><th>Geregistreerd</th><th>Omzetindicatie</th><th>Urenstatus</th><th>Vervolgactie</th></tr></thead>
      <tbody>
        <tr class="warm"><td><div class="who"><span class="av">MR</span><span><strong>Marc de Roon</strong><small>Testconsultant</small></span></div></td><td><div class="cell"><strong>IND</strong><small>Itaq</small></div></td><td><div class="cell"><strong>0,0</strong><small>uur</small></div></td><td><div class="cell"><strong>€ 0</strong><small>excl. btw</small></div></td><td><span class="sp grey">Nog te starten</span></td><td><button class="mini-btn">Details openen</button></td></tr>
        <tr class="warm"><td><div class="who"><span class="av">SV</span><span><strong>Stasjo van Bakel</strong><small>Test Engineer</small></span></div></td><td><div class="cell"><strong>IND</strong><small>Itaq</small></div></td><td><div class="cell"><strong>0,0</strong><small>uur</small></div></td><td><div class="cell"><strong>€ 0</strong><small>excl. btw</small></div></td><td><span class="sp grey">Nog te starten</span></td><td><button class="mini-btn">Details openen</button></td></tr>
        <tr class="plain"><td><div class="who"><span class="av">BH</span><span><strong>Brian Hek</strong><small>Test Engineer</small></span></div></td><td><div class="cell"><strong>COA</strong><small>Itaq</small></div></td><td><div class="cell"><strong>152,0</strong><small>uur</small></div></td><td><div class="cell"><strong>€ 12.312</strong><small>excl. btw</small></div></td><td><span class="sp sub">Ingediend</span></td><td><button class="mini-btn">Uren controleren</button></td></tr>
        <tr class="plain"><td><div class="who"><span class="av">SN</span><span><strong>Shawn-Douglas Nahar</strong><small>Test Automation</small></span></div></td><td><div class="cell"><strong>Belastingdienst</strong><small>circle8</small></div></td><td><div class="cell"><strong>144,0</strong><small>uur</small></div></td><td><div class="cell"><strong>€ 11.520</strong><small>excl. btw</small></div></td><td><span class="sp ok">Goedgekeurd</span></td><td><button class="mini-btn">Details openen</button></td></tr>
      </tbody>
    </table>
    <div class="legend"><span><i class="g"></i>Groen afgerond</span><span><i class="o"></i>Oranje actie nodig</span><span><i class="n"></i>Grijs nog niet gestart</span></div>
  </div>`,
});

/* ---------- LOGIN ---------- */
page("Login", {
  login: true, height: 900,
  body: `<div style="min-height:900px;display:grid;place-items:center;padding:40px;">
  <div class="login-panel">
    <div class="brandbar"><span class="logo" style="width:44px;height:44px;font-size:22px;">P</span><b>Uren &amp; Facturatie</b><span class="env" style="margin-left:auto;">Veilige testomgeving</span></div>
    <h1>Welkom bij Path Uren</h1>
    <p class="intro">Meld je aan met je persoonlijke Path-account. Elke aanmelding opent standaard de actuele maand; een eerder gekozen maand blijft alleen binnen dezelfde sessie bewaard.</p>
    <div class="login-form">
      <div class="form-field"><label>E-mailadres</label><input value="gio.maatsen@pathconsultancy.nl"></div>
      <div class="form-field"><label>Wachtwoord</label><input type="password" value="............"></div>
      <button class="btn-primary">Inloggen ${ic("arrow", 14)}</button>
      <a class="forgot" href="#">Wachtwoord vergeten?</a>
    </div>
    <div class="login-foot"><span>Path Consultancy — handelsnaam van QSI Consultancy B.V.</span><span>v0.9.159</span></div>
  </div>
  </div>`,
});

/* ---------- URENOVERZICHT (employee) ---------- */
page("Urenoverzicht", {
  active: "uren", title: "Urenoverzicht", height: 1040,
  topOpts: { period: "September 2026" },
  body: `<div class="view-head">
    <div><h2>Mijn uren · September 2026</h2><p>Vul je uren per dag in. Tussentijds opslaan gebeurt automatisch. Alleen een volledige maand kun je indienen.</p></div>
    <div class="head-actions"><button class="btn-ghost">Weekoverzicht</button><button class="btn-primary">Maand indienen ${ic("arrow", 14)}</button></div>
  </div>
  <div class="panel">
    <div class="toolbar">
      <div class="week-tabs"><button>Hele maand</button><button class="on">Week 36</button><button>Week 37</button><button>Week 38</button><button>Week 39</button></div>
      <span style="color:var(--muted);font-size:11px;font-weight:700;">Automatisch opgeslagen om 16:24</span>
    </div>
    <div style="padding:18px 22px;">
      <table class="hours-table">
        <thead><tr><th style="text-align:left;">Dag</th><th>Ma</th><th>Di</th><th>Wo</th><th>Do</th><th>Vr</th><th>Totaal</th></tr></thead>
        <tbody>
          <tr><td class="day">1 – 5 sep</td><td><input value="8"></td><td><input value="8"></td><td><input value="8"></td><td><input value="8"></td><td><input value="8"></td><td>40,0</td></tr>
          <tr><td class="day">8 – 12 sep</td><td><input value="8"></td><td><input value="8"></td><td><input value="8"></td><td><input value="8"></td><td><input value="4"></td><td>36,0</td></tr>
          <tr><td class="day">15 – 19 sep</td><td><input value="8"></td><td><input value="8"></td><td><input value="8"></td><td><input value="8"></td><td><input value="8"></td><td>40,0</td></tr>
          <tr><td class="day">22 – 26 sep</td><td><input value="8"></td><td><input value="8"></td><td><input value="8"></td><td><input value=""></td><td><input value=""></td><td>24,0</td></tr>
          <tr class="tot"><td class="day" style="background:var(--green-light);">Maandtotaal</td><td colspan="5"></td><td>140,0</td></tr>
        </tbody>
      </table>
    </div>
    <div class="stat-strip">
      <div><span>Geregistreerd</span><strong>140,0 uur</strong></div>
      <div><span>Contracturen</span><strong>151,2 uur</strong></div>
      <div><span>Verschil</span><strong>− 11,2 uur</strong></div>
      <div><span>Status</span><strong style="font-size:14px;"><span class="sp grey">Concept</span></strong></div>
    </div>
  </div>`,
});

/* ---------- GOEDKEURINGEN ---------- */
page("Goedkeuringen", {
  active: "goedkeuringen", title: "Goedkeuringen", height: 940,
  body: `<div class="view-head">
    <div><h2>Uren goedkeuren · September 2026</h2><p>Eén controle per medewerker en maand. Terugsturen kan alleen met een verplichte reden.</p></div>
    <div class="head-actions"><div class="filters"><button class="on">Deze maand</button><button>Alle open</button><button>Augustus</button></div></div>
  </div>
  <div class="panel">
    <div class="panel-head"><div><h3>1 wacht op controle</h3><p>Backoffice · September 2026</p></div><a href="#">Volgorde: logisch (maand · medewerker)</a></div>
    <table class="tbl">
      <thead><tr><th>Medewerker</th><th>Periode</th><th>Uren</th><th>Contract</th><th>Klanturenstaat</th><th>Status</th><th>Actie</th></tr></thead>
      <tbody>
        <tr class="plain"><td><div class="who"><span class="av">BH</span><span><strong>Brian Hek</strong><small>COA / Itaq</small></span></div></td><td><div class="cell"><strong>September 2026</strong></div></td><td><div class="cell"><strong>152,0</strong><small>declarabel</small></div></td><td><div class="cell"><strong>152,0</strong></div></td><td><span class="sp warn">Nog niet ontvangen</span></td><td><span class="sp sub">Ingediend</span></td><td><button class="btn-primary" style="padding:9px 14px;font-size:11px;">Controle openen</button></td></tr>
      </tbody>
    </table>
    <div class="legend"><span><i class="g"></i>Goedgekeurd</span><span><i class="o"></i>Wacht op medewerker</span><span><i class="n"></i>Nog niet ingediend</span></div>
  </div>
  <div class="panel">
    <div class="panel-head"><div><h3>Eerder afgehandeld</h3><p>Deze maand · alleen-lezen</p></div></div>
    <table class="tbl">
      <thead><tr><th>Medewerker</th><th>Periode</th><th>Uren</th><th>Afgehandeld door</th><th>Status</th></tr></thead>
      <tbody>
        <tr class="plain"><td><div class="who"><span class="av">SN</span><span><strong>Shawn-Douglas Nahar</strong><small>Belastingdienst / circle8</small></span></div></td><td>September 2026</td><td>144,0</td><td>Gio Maatsen · 2 sep</td><td><span class="sp ok">Goedgekeurd</span></td></tr>
      </tbody>
    </table>
  </div>`,
});

/* ---------- FACTUREN (list) ---------- */
const facturenBody = `<div class="view-head">
    <div><h2>Facturen · September 2026</h2><p>Overzicht van te factureren periodes en documentstatussen.</p></div>
    <div class="head-actions"><button class="btn-ghost">${ic("export", 14)}Exporteren</button><button class="btn-primary">${ic("plus", 14)}Nieuwe factuur</button></div>
  </div>
  <div class="kpis" style="margin-bottom:16px;">
    <div class="kpi"><span class="lbl">Totaal relaties</span><span class="v"><strong>9</strong></span></div>
    <div class="kpi"><span class="lbl">Facturen aanwezig</span><span class="v"><strong>5</strong><span>56%</span></span></div>
    <div class="kpi"><span class="lbl">Urenstaten extern bevestigd</span><span class="v"><strong>3</strong><span class="warn">33%</span></span></div>
    <div class="kpi"><span class="lbl">Ontbrekend</span><span class="v"><strong>1</strong><span class="dgr">11%</span></span></div>
  </div>
  <div class="panel">
    <div class="toolbar">
      <div class="search">${ic("search", 15)}<input placeholder="Zoek op relatie of medewerker…"></div>
      <div class="filters"><button class="on">Alle</button><button>Aanwezig</button><button>Extern bevestigd</button><button>Ontbreekt</button></div>
    </div>
    <table class="tbl">
      <thead><tr><th>Medewerker</th><th>Relatie</th><th>Periode</th><th>Bedrag excl.</th><th>Factuur</th><th>Urenstaat</th><th>Acties</th></tr></thead>
      <tbody>
        <tr class="plain"><td><div class="who"><span class="av">SN</span><span><strong>Shawn-Douglas Nahar</strong><small>circle8</small></span></div></td><td><div class="cell"><strong>Belastingdienst</strong><small>Bel-Shawn-2026-september</small></div></td><td>Sep 2026</td><td><div class="cell"><strong>€ 11.520</strong></div></td><td><span class="sp ok">Aanwezig</span></td><td><span class="sp ok">Extern bevestigd</span></td><td><button class="kebab">${ic("doc", 15)}</button> <button class="kebab"><svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" stroke="none"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg></button></td></tr>
        <tr class="plain"><td><div class="who"><span class="av">BH</span><span><strong>Brian Hek</strong><small>Itaq</small></span></div></td><td><div class="cell"><strong>COA</strong><small>COA-2026-september</small></div></td><td>Sep 2026</td><td><div class="cell"><strong>€ 12.312</strong></div></td><td><span class="sp sub">Concept</span></td><td><span class="sp warn">Nog niet ontvangen</span></td><td><button class="kebab">${ic("doc", 15)}</button> <button class="kebab"><svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" stroke="none"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg></button></td></tr>
        <tr class="plain"><td><div class="who"><span class="av">MR</span><span><strong>Marc de Roon</strong><small>Itaq</small></span></div></td><td><div class="cell"><strong>IND</strong><small>IND-2026-september</small></div></td><td>Sep 2026</td><td><div class="cell"><strong>—</strong></div></td><td><span class="sp dgr">Ontbreekt</span></td><td><span class="sp grey">Nog niet gestart</span></td><td><button class="kebab">${ic("doc", 15)}</button> <button class="kebab"><svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" stroke="none"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg></button></td></tr>
        <tr class="plain"><td><div class="who"><span class="av">SV</span><span><strong>Stasjo van Bakel</strong><small>Itaq</small></span></div></td><td><div class="cell"><strong>IND</strong><small>IND-StvB-2026-september</small></div></td><td>Sep 2026</td><td><div class="cell"><strong>€ 9.072</strong></div></td><td><span class="sp ok">Aanwezig</span></td><td><span class="sp ok">Extern bevestigd</span></td><td><button class="kebab">${ic("doc", 15)}</button> <button class="kebab"><svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" stroke="none"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg></button></td></tr>
      </tbody>
    </table>
    <div class="pager"><span>1–4 van 9</span><label>Per pagina <select><option>25</option><option>50</option></select></label><div class="pages"><button>${ic("left", 14)}</button><button class="on">1</button><button>2</button><button>${ic("right", 14)}</button></div></div>
  </div>`;
page("Facturen", { active: "facturen", title: "Facturen", height: 1000, body: facturenBody });

/* ---------- DOCUMENTARCHIEF (modal over facturen) ---------- */
page("Documentarchief", {
  active: "facturen", title: "Facturen", height: 900,
  body: `<div style="filter:blur(1px);opacity:.5;pointer-events:none;">${facturenBody}</div>
  <div class="overlay">
    <div class="dialog">
      <div class="dialog-head">
        <div><h3>Documentarchief</h3><p>Shawn-Douglas Nahar · September 2026</p></div>
        <button class="x">${ic("x", 16)}</button>
      </div>
      <div class="dialog-body">
        <div class="stepper">
          <div class="st done"><span class="dot">1</span><span class="lbl">Ontbreekt</span></div>
          <div class="line done"></div>
          <div class="st done"><span class="dot">2</span><span class="lbl">Reden gekozen</span></div>
          <div class="line done"></div>
          <div class="st done"><span class="dot">${ic("check", 15)}</span><span class="lbl">Extern bevestigd</span></div>
        </div>
        <div class="doc-grid">
          <div class="doc present">
            <header><span class="ic">${ic("file", 16)}</span><strong>Factuur</strong><span class="sp ok">Aanwezig</span></header>
            <div class="body"><p>De factuur is aanwezig in het archief en gekoppeld aan deze periode.</p>
              <dl><div><dt>Bestand</dt><dd>Bel-Shawn-2026-september.pdf</dd></div><div><dt>Bedrag</dt><dd>€ 11.520,00 excl. btw</dd></div></dl>
            </div>
          </div>
          <div class="doc present">
            <header><span class="ic">${ic("clock", 16)}</span><strong>Urenstaat</strong><span class="sp ok">Extern bevestigd</span></header>
            <div class="body">
              <dl><div><dt>Reden</dt><dd>Goedkeuring van uren per e-mail ontvangen.</dd></div><div><dt>Datum</dt><dd>2 september 2026</dd></div><div><dt>Door</dt><dd>Gio Maatsen</dd></div></dl>
            </div>
          </div>
        </div>
        <div class="danger-box">
          ${ic("undo", 17)}
          <div style="flex:1;"><strong>Externe bevestiging terugdraaien</strong><small>Hiermee wordt de urenstaat weer als ontbrekend gemarkeerd. Een tweede bevestiging is vereist.</small></div>
          <button class="btn-danger">Terugdraaien</button>
        </div>
      </div>
      <div class="dialog-foot"><button class="btn-ghost">Annuleren</button><button class="btn-primary">Sluiten</button></div>
    </div>
  </div>`,
});

/* ---------- KLANTURENSTATEN ---------- */
page("Klanturenstaten", {
  active: "klanturenstaten", title: "Klanturenstaten", height: 960,
  body: `<div class="view-head">
    <div><h2>Klanturenstaten · September 2026</h2><p>De officiële klantdocumenten per medewerker. De app maakt ze niet zelf aan; ze worden los van de urenregistratie toegevoegd.</p></div>
    <div class="head-actions"><div class="filters"><button class="on">Alle</button><button>Te controleren</button><button>Ontbrekend</button></div></div>
  </div>
  <div class="kpis" style="margin-bottom:16px;">
    <div class="kpi"><span class="lbl">Goedgekeurd</span><span class="v"><strong>1</strong><span>25%</span></span></div>
    <div class="kpi"><span class="lbl">Te controleren</span><span class="v"><strong>1</strong><span class="warn">25%</span></span></div>
    <div class="kpi"><span class="lbl">Rechtstreeks gemaild</span><span class="v"><strong>1</strong><span class="mut">25%</span></span></div>
    <div class="kpi"><span class="lbl">Ontbrekend</span><span class="v"><strong>1</strong><span class="dgr">25%</span></span></div>
  </div>
  <div class="cards">
    <div class="ecard warm">
      <div class="top-row"><div class="who"><span class="av">MR</span><span><strong>Marc de Roon</strong><small>IND · Itaq</small></span></div><span class="sp warn">Nog niet ontvangen</span></div>
      <div class="grid3"><div class="field"><span>Deadline</span><strong>5e werkdag</strong></div><div class="field"><span>Brokerroute</span><strong>Standaard</strong></div><div class="field"><span>Factuur zonder staat</span><strong>Niet toegestaan</strong></div></div>
      <div class="row-actions"><button class="btn-ghost">Herinnering sturen</button><button class="btn-ghost">Al rechtstreeks gemaild</button></div>
    </div>
    <div class="ecard">
      <div class="top-row"><div class="who"><span class="av">BH</span><span><strong>Brian Hek</strong><small>COA · Itaq</small></span></div><span class="sp sub">Ontvangen — te controleren</span></div>
      <div class="grid3"><div class="field"><span>Bestand</span><strong>Klanturenstaat_Brian_Hek_2026-09.pdf</strong></div><div class="field"><span>Ontvangen</span><strong>2 sep</strong></div><div class="field"><span>Brokerroute</span><strong>gio+broker@…</strong></div></div>
      <div class="row-actions"><button class="btn-ghost">Document bekijken</button><button class="btn-primary">Controleren &amp; goedkeuren ${ic("arrow", 14)}</button></div>
    </div>
    <div class="ecard">
      <div class="top-row"><div class="who"><span class="av">SN</span><span><strong>Shawn-Douglas Nahar</strong><small>Belastingdienst · circle8</small></span></div><span class="sp ok">Extern bevestigd</span></div>
      <div class="grid3"><div class="field"><span>Reden</span><strong>Rechtstreeks gemaild</strong></div><div class="field"><span>Datum</span><strong>2 sep</strong></div><div class="field"><span>Door</span><strong>Gio Maatsen</strong></div></div>
      <div class="row-actions"><button class="btn-ghost">${ic("undo", 14)}Externe bevestiging intrekken</button></div>
    </div>
    <div class="ecard">
      <div class="top-row"><div class="who"><span class="av">SV</span><span><strong>Stasjo van Bakel</strong><small>IND · Itaq</small></span></div><span class="sp ok">Goedgekeurd &amp; verstuurd</span></div>
      <div class="grid3"><div class="field"><span>Naar broker</span><strong>2 sep · 16:40</strong></div><div class="field"><span>Onderwerp</span><strong>Klanturenstaat sep — dossier</strong></div><div class="field"><span>Bijlage</span><strong>factuur + staat</strong></div></div>
      <div class="row-actions"><button class="btn-ghost">Verzendlog bekijken</button></div>
    </div>
  </div>`,
});

/* ---------- MEDEDELINGEN ---------- */
page("Mededelingen", {
  active: "mededelingen", title: "Mededelingen", height: 940,
  body: `<div class="view-head">
    <div><h2>Mededelingen</h2><p>Bericht aan iedereen, een klantgroep of gekozen medewerkers. Na een wijziging zien medewerkers alleen de nieuwste tekst.</p></div>
    <div class="head-actions"><button class="btn-ghost">Concepten</button><button class="btn-primary">${ic("plus", 14)}Nieuwe mededeling</button></div>
  </div>
  <div class="panel">
    <div class="panel-head"><div><h3>Verzonden &amp; concepten</h3><p>Interne historie blijft altijd bewaard</p></div><div class="filters"><button class="on">Alle</button><button>Verzonden</button><button>Concept</button><button>Ingetrokken</button></div></div>
    <table class="tbl">
      <thead><tr><th>Onderwerp</th><th>Doelgroep</th><th>Laatst gewijzigd</th><th>Status</th><th>Acties</th></tr></thead>
      <tbody>
        <tr class="plain"><td><div class="cell"><strong>Indienen uren september</strong><small>v2 · eerder gewijzigd</small></div></td><td>Alle medewerkers</td><td>2 sep · 09:10</td><td><span class="sp ok">Verzonden</span></td><td><button class="mini-btn">Openen</button></td></tr>
        <tr class="plain"><td><div class="cell"><strong>Kantoor gesloten 3 oktober</strong></div></td><td>Alle medewerkers</td><td>1 sep · 14:22</td><td><span class="sp ok">Verzonden</span></td><td><button class="mini-btn">Openen</button></td></tr>
        <tr class="warm"><td><div class="cell"><strong>Nieuwe declaratieprocedure</strong><small>alleen intern zichtbaar</small></div></td><td>Consultants Itaq</td><td>31 aug · 16:05</td><td><span class="sp grey">Concept</span></td><td><button class="mini-btn">Bewerken</button></td></tr>
        <tr class="plain"><td><div class="cell"><strong>Tariefwijziging Q4 — ingetrokken</strong><small>reden: verkeerde doelgroep</small></div></td><td>Circle8</td><td>28 aug · 11:40</td><td><span class="sp dgr">Ingetrokken</span></td><td><button class="mini-btn">Historie</button></td></tr>
      </tbody>
    </table>
    <div class="pager"><span>1–4 van 12</span><label>Per pagina <select><option>25</option><option>50</option></select></label><div class="pages"><button>${ic("left", 14)}</button><button class="on">1</button><button>2</button><button>${ic("right", 14)}</button></div></div>
  </div>`,
});

/* ---------- MEDEWERKERS (Teambeheer) ---------- */
page("Medewerkers", {
  active: "medewerkers", title: "Medewerkers", height: 1080,
  body: `<div class="view-head">
    <div><h2>Teambeheer</h2><p>Beheer medewerkers, toegang, inzet en opdracht- en routeringsgegevens. De getoonde werkstatussen horen bij september 2026.</p></div>
    <div class="head-actions"><button class="btn-ghost">${ic("users", 14)}Beheerder toevoegen</button><button class="btn-primary">${ic("plus", 14)}Medewerker toevoegen</button></div>
  </div>
  <div class="kpis" style="margin-bottom:16px;">
    <div class="kpi"><span class="lbl">Actieve accounts</span><span class="v"><strong>7</strong></span></div>
    <div class="kpi"><span class="lbl">Medewerkers</span><span class="v"><strong>5</strong><span>100%</span></span></div>
    <div class="kpi"><span class="lbl">Beheerders</span><span class="v"><strong>2</strong><span>100%</span></span></div>
    <div class="kpi"><span class="lbl">Toegang in afwachting</span><span class="v"><strong>1</strong><span class="warn">14%</span></span></div>
  </div>
  <div class="panel" style="margin-bottom:16px;">
    <div class="toolbar">
      <div class="search">${ic("search", 15)}<input placeholder="Zoek medewerker of beheerder…"></div>
      <div class="filters"><button class="on">Actief</button><button>Inactief</button><button>Alle</button></div>
    </div>
    <div class="cards" style="padding:18px 22px;">
      <div class="ecard">
        <div class="top-row"><div class="who"><span class="av">MR</span><span><strong>Marc de Roon</strong><small>Testconsultant · marcderoon@pathconsultancy.nl</small></span></div><span class="sp ok">Actief</span></div>
        <div class="grid3"><div class="field"><span>Klant</span><strong>IND</strong></div><div class="field"><span>Uren per week</span><strong>40,0 uur</strong></div><div class="field"><span>Broker</span><strong>Itaq</strong></div></div>
        <div class="row-actions"><button class="btn-ghost">Gegevens aanpassen</button><button class="btn-ghost">Wachtwoord resetten</button><button class="btn-ghost">Deactiveren</button></div>
      </div>
      <div class="ecard">
        <div class="top-row"><div class="who"><span class="av">SV</span><span><strong>Stasjo van Bakel</strong><small>Test Engineer · stasjovanbakel@pathconsultancy.nl</small></span></div><span class="sp ok">Actief</span></div>
        <div class="grid3"><div class="field"><span>Klant</span><strong>IND</strong></div><div class="field"><span>Uren per week</span><strong>36,0 uur</strong></div><div class="field"><span>Broker</span><strong>Itaq</strong></div></div>
        <div class="row-actions"><button class="btn-ghost">Gegevens aanpassen</button><button class="btn-ghost">Wachtwoord resetten</button><button class="btn-ghost">Deactiveren</button></div>
      </div>
      <div class="ecard">
        <div class="top-row"><div class="who"><span class="av">BH</span><span><strong>Brian Hek</strong><small>Test Engineer · brian.hek@pathconsultancy.nl</small></span></div><span class="sp ok">Actief</span></div>
        <div class="grid3"><div class="field"><span>Klant</span><strong>COA</strong></div><div class="field"><span>Uren per week</span><strong>36,0 uur</strong></div><div class="field"><span>Broker</span><strong>Itaq</strong></div></div>
        <div class="row-actions"><button class="btn-ghost">Gegevens aanpassen</button><button class="btn-ghost">Wachtwoord resetten</button><button class="btn-ghost">Deactiveren</button></div>
      </div>
      <div class="ecard warm">
        <div class="top-row"><div class="who"><span class="av">SN</span><span><strong>Shawn-Douglas Nahar</strong><small>Test Automation · shawn.nahar@pathconsultancy.nl</small></span></div><span class="sp warn">Toegang in afwachting</span></div>
        <div class="grid3"><div class="field"><span>Klant</span><strong>Belastingdienst</strong></div><div class="field"><span>Uren per week</span><strong>40,0 uur</strong></div><div class="field"><span>Broker</span><strong>circle8</strong></div></div>
        <div class="row-actions"><button class="btn-primary">Uitnodiging opnieuw sturen ${ic("arrow", 14)}</button><button class="btn-ghost">Gegevens aanpassen</button></div>
      </div>
    </div>
  </div>
  <div class="panel">
    <div class="panel-head"><div><h3>Beheerders</h3><p>2 actief · beschermde systeemrol</p></div></div>
    <table class="tbl">
      <thead><tr><th>Naam</th><th>E-mailadres</th><th>Rol</th><th>Status</th><th>Acties</th></tr></thead>
      <tbody>
        <tr class="plain"><td><div class="who"><span class="av">GM</span><span><strong>Gio Maatsen</strong></span></div></td><td>giovanno.maatsen@pathconsultancy.nl</td><td>Administrator</td><td><span class="sp ok">Actief</span></td><td><button class="mini-btn">Aanpassen</button></td></tr>
        <tr class="plain"><td><div class="who"><span class="av">JS</span><span><strong>Joyce van der Steenhoven</strong></span></div></td><td>info@pathconsultancy.nl</td><td>Administrator</td><td><span class="sp ok">Actief</span></td><td><button class="mini-btn">Aanpassen</button></td></tr>
      </tbody>
    </table>
  </div>`,
});

/* ---------- INSTELLINGEN ---------- */
page("Instellingen", {
  active: "instellingen", title: "Instellingen", height: 1000, topOpts: { pill: false },
  body: `<div class="view-head">
    <div><h2>Instellingen</h2><p>Bedrijfsgegevens, facturatie, mailroutes en herinneringen. Wijzigingen gelden voor de hele werkomgeving.</p></div>
    <div class="head-actions"><button class="btn-ghost">Wijzigingen ongedaan maken</button><button class="btn-primary">Opslaan</button></div>
  </div>
  <div class="settings-grid">
    <nav class="settings-nav">
      <a class="on" href="#">Bedrijf &amp; facturatie</a>
      <a href="#">Mailroutes</a>
      <a href="#">Herinneringen</a>
      <a href="#">Beveiliging &amp; toegang</a>
      <a href="#">Voorbeeldgegevens</a>
    </nav>
    <div style="display:grid;gap:16px;">
      <div class="panel"><div style="padding:22px 24px;">
        <h3 style="font-size:17px;margin-bottom:16px;">Facturerende identiteit</h3>
        <div class="field-row">
          <div class="form-field"><label>Handelsnaam</label><input value="Path Consultancy"></div>
          <div class="form-field"><label>Juridische naam</label><input value="QSI Consultancy B.V."></div>
        </div>
        <div class="field-row" style="margin-top:14px;">
          <div class="form-field"><label>KvK-nummer</label><input value="12345678"></div>
          <div class="form-field"><label>Btw-nummer</label><input value="NL0000.00.000.B01"></div>
        </div>
        <div class="field-row" style="margin-top:14px;">
          <div class="form-field"><label>IBAN</label><input value="NL00 BANK 0000 0000 00"></div>
          <div class="form-field"><label>Betalingstermijn</label><select><option>30 dagen</option><option>14 dagen</option></select></div>
        </div>
        <div class="field-row one" style="margin-top:14px;">
          <div class="form-field"><label>Weergave op factuur-PDF</label>
            <select><option>Handelsnaam + juridische naam</option><option>Alleen juridische naam</option></select>
            <span class="hint">Bepaalt hoe de facturerende onderneming bovenaan de definitieve PDF verschijnt.</span>
          </div>
        </div>
      </div></div>
      <div class="panel"><div style="padding:22px 24px;">
        <h3 style="font-size:17px;margin-bottom:8px;">Herinneringen</h3>
        <div class="toggle"><span class="sw"></span><div class="txt"><strong>Week niet compleet</strong><small>Vrijdag 15:00 — alleen na server-side opt-in per medewerker.</small></div></div>
        <div class="toggle"><span class="sw"></span><div class="txt"><strong>Maand niet ingediend</strong><small>Laatste werkdag 15:00.</small></div></div>
        <div class="toggle"><span class="sw off"></span><div class="txt"><strong>Klanturenstaat-deadline</strong><small>Eén werkdag vooraf 15:00, op de deadline 10:00, twee werkdagen te laat 10:00.</small></div></div>
        <div class="toggle"><span class="sw off"></span><div class="txt"><strong>Automatische verzending</strong><small>Pas activeren na schriftelijke acceptatie. Nu: voorbereiding — niet automatisch.</small></div></div>
      </div></div>
    </div>
  </div>`,
});

console.log("done");
