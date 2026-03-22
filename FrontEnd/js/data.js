// ═══════════════════════════════════════════════════════════════════
//  DATA.JS — Every value verified against real output files.
//
//  Verification audit:
//    nat_pm         → air_pollution_master.csv  (annual mean PM2.5, all cities)
//    nat_all_deaths → disease_national.csv      (metric_name='Number', all causes)
//    per_disease    → disease_national.csv      (metric_name='Number', per cause)
//    state_summary  → air_pollution_master.csv  (PM2.5 mean per state)
//                     disease_master.csv        (cumulative deaths per state)
//    correlations   → corr_data.json
//    taskb          → taskb_regression_results.csv (train R², top 8)
//    taskA_metrics  → phase5_model_summary.csv
//    features       → phase5_model_summary.csv
// ═══════════════════════════════════════════════════════════════════

const DATA = {

  // Source: air_pollution_master.csv — mean PM2.5 all city-month rows per year
  // Missing years (2010-2012, 2014) had no station data in this dataset
  nat_pm: {
    2013: 142.90,
    2015:  92.93,
    2016:  73.79,
    2017:  75.83,
    2018:  67.29,
    2019:  60.48,
    2020:  50.22,
    2021:  53.12,
    2022:  53.39,
    2023:  65.11,
  },

  // Source: disease_national.csv — sum of all 21 GBD causes per year, Number metric
  nat_all_deaths: {
    2010:  8762029,
    2011:  9116134,
    2012:  9489471,
    2013:  9701184,
    2014:  9893452,
    2015: 10027326,
    2016: 10396188,
    2017: 10527139,
    2018: 10631175,
    2019: 10257644,
    2020: 10634311,
    2021: 12094128,
    2022: 10637628,
    2023: 10830410,
  },

  // Source: disease_national.csv — metric_name='Number', all 21 causes
  per_disease: {
    "Asthma": {2010:138433,2011:147438,2012:155905,2013:158490,2014:160779,2015:157701,2016:160277,2017:158156,2018:161426,2019:157561,2020:141302,2021:147770,2022:165820,2023:168948},
    "Atrial fibrillation and flutter": {2010:17721,2011:18963,2012:20570,2013:22269,2014:23692,2015:26022,2016:27881,2017:29299,2018:30326,2019:30718,2020:32373,2021:32799,2022:35703,2023:38483},
    "Cardiovascular diseases": {2010:2174586,2011:2332246,2012:2505176,2013:2593090,2014:2684013,2015:2764634,2016:2933370,2017:2980930,2018:3027080,2019:2893760,2020:2846927,2021:3161468,2022:3036919,2023:3121037},
    "Chronic obstructive pulmonary disease": {2010:720470,2011:741487,2012:762836,2013:782344,2014:799100,2015:801636,2016:816538,2017:837875,2018:862581,2019:874481,2020:782771,2021:791232,2022:945006,2023:1023485},
    "Chronic respiratory diseases": {2010:893975,2011:925432,2012:956755,2013:980332,2014:1000893,2015:1001486,2016:1020765,2017:1041924,2018:1072438,2019:1082445,2020:972969,2021:990714,2022:1170061,2023:1254036},
    "Congenital birth defects": {2010:101329,2011:98344,2012:96061,2013:95483,2014:94046,2015:91980,2016:91813,2017:92966,2018:94655,2019:97180,2020:103829,2021:104421,2022:101513,2023:95167},
    "Hypertensive heart disease": {2010:148616,2011:155359,2012:162667,2013:170590,2014:176927,2015:188523,2016:199235,2017:207774,2018:211750,2019:210424,2020:217305,2021:227526,2022:231895,2023:245788},
    "Interstitial lung disease and pulmonary sarcoidosis": {2010:22483,2011:23681,2012:24920,2013:26061,2014:27272,2015:28224,2016:29745,2017:31435,2018:33628,2019:35319,2020:34446,2021:36508,2022:42560,2023:43590},
    "Ischemic heart disease": {2010:1088933,2011:1193242,2012:1316076,2013:1342445,2014:1377297,2015:1386327,2016:1456812,2017:1442114,2018:1444348,2019:1348461,2020:1302071,2021:1504918,2022:1422125,2023:1464977},
    "Ischemic stroke": {2010:262261,2011:285539,2012:309064,2013:331023,2014:351909,2015:372238,2016:407364,2017:422587,2018:440900,2019:422151,2020:406257,2021:433860,2022:436855,2023:436978},
    "Lower respiratory infections": {2010:512791,2011:505332,2012:498796,2013:498092,2014:493067,2015:483951,2016:478433,2017:478067,2018:469536,2019:451812,2020:364208,2021:325613,2022:385248,2023:412055},
    "Neonatal encephalopathy due to birth asphyxia and trauma": {2010:122988,2011:118377,2012:113649,2013:113702,2014:112437,2015:108858,2016:106838,2017:105068,2018:104057,2019:102571,2020:102385,2021:94250,2022:90060,2023:85632},
    "Neonatal preterm birth": {2010:284344,2011:282177,2012:281798,2013:280689,2014:277526,2015:271059,2016:261742,2017:250962,2018:236725,2019:215668,2020:197747,2021:176053,2022:167396,2023:157112},
    "Otitis media": {2010:91,2011:93,2012:92,2013:91,2014:89,2015:87,2016:86,2017:85,2018:83,2019:79,2020:71,2021:67,2022:71,2023:71},
    "Pulmonary Arterial Hypertension": {2010:3385,2011:3420,2012:3455,2013:3516,2014:3563,2015:3633,2016:3715,2017:3736,2018:3719,2019:3625,2020:3679,2021:3836,2022:3712,2023:3831},
    "Pulmonary aspiration and foreign body in airway": {2010:4862,2011:4761,2012:4712,2013:4819,2014:4942,2015:5044,2016:5267,2017:5425,2018:5589,2019:5757,2020:6176,2021:6299,2022:6115,2023:6480},
    "Respiratory infections and tuberculosis": {2010:1041472,2011:1022654,2012:997118,2013:983478,2014:962259,2015:947023,2016:933801,2017:929664,2018:901148,2019:852966,2020:1697360,2021:2548206,2022:927770,2023:800614},
    "Stroke": {2010:644698,2011:686963,2012:724927,2013:770606,2014:813397,2015:861566,2016:936845,2017:982853,2018:1020943,2019:990897,2020:975570,2021:1053339,2022:1021368,2023:1034796},
    "Tracheal, bronchus, and lung cancer": {2010:50001,2011:53399,2012:56666,2013:58768,2014:61142,2015:64348,2016:70378,2017:74706,2018:78714,2019:80694,2020:84668,2021:101942,2022:96777,2023:101269},
    "Tuberculosis": {2010:526777,2011:515386,2012:496356,2013:483455,2014:467321,2015:461325,2016:453675,2017:450022,2018:430081,2019:399728,2020:360970,2021:352040,2022:349371,2023:334868},
    "Upper respiratory infections": {2010:1813,2011:1843,2012:1872,2013:1840,2014:1782,2015:1659,2016:1607,2017:1491,2018:1449,2019:1347,2020:1225,2021:1268,2022:1284,2023:1194},
  },

  // Source: air_pollution_master.csv (PM2.5 mean per state)
  //         disease_master.csv (cumulative Number deaths per state, all years, all causes)
  // deaths = raw count (not ×1000). Sorted by PM2.5 descending (real ranking).
  state_summary: {
    "Delhi":             { pm: 108.5, deaths: 1373  },
    "Bihar":             { pm:  89.8, deaths: 10014 },
    "Uttar Pradesh":     { pm:  84.3, deaths: 24165 },
    "Assam":             { pm:  76.6, deaths: 2973  },
    "Haryana":           { pm:  70.3, deaths: 2894  },
    "Himachal Pradesh":  { pm:  68.8, deaths: 718   },
    "Jharkhand":         { pm:  64.0, deaths: 2933  },
    "Rajasthan":         { pm:  63.7, deaths: 7625  },
    "West Bengal":       { pm:  59.0, deaths: 10640 },
    "Tripura":           { pm:  57.6, deaths: 406   },
    "Odisha":            { pm:  57.0, deaths: 4406  },
    "Gujarat":           { pm:  54.7, deaths: 6977  },
    "Punjab":            { pm:  51.8, deaths: 3483  },
    "Madhya Pradesh":    { pm:  47.1, deaths: 8814  },
    "Maharashtra":       { pm:  44.5, deaths: 12050 },
    "Telangana":         { pm:  40.1, deaths: 6848  },
    "Uttarakhand":       { pm:  38.1, deaths: 1914  },
    "Tamil Nadu":        { pm:  37.4, deaths: 9339  },
    "Andhra Pradesh":    { pm:  36.2, deaths: 6551  },
    "Karnataka":         { pm:  29.5, deaths: 8012  },
  },

  // Source: corr_data.json — Pearson r, n=96 state-year obs, Phase 5 Task B
  correlations: [
    { d: "Upper respiratory infections",            r:  0.684, sig: true,  type: "strong"   },
    { d: "Neonatal encephalopathy",                 r:  0.664, sig: true,  type: "indirect" },
    { d: "Neonatal preterm birth",                  r:  0.498, sig: true,  type: "indirect" },
    { d: "Otitis media",                            r:  0.436, sig: true,  type: "strong"   },
    { d: "Lower respiratory infections",            r:  0.404, sig: true,  type: "strong"   },
    { d: "Congenital birth defects",                r:  0.373, sig: true,  type: "indirect" },
    { d: "Asthma",                                  r:  0.362, sig: true,  type: "direct"   },
    { d: "Tuberculosis",                            r:  0.356, sig: true,  type: "strong"   },
    { d: "Chronic respiratory diseases",            r:  0.192, sig: false, type: "direct"   },
    { d: "Chronic obstructive pulmonary disease",   r:  0.182, sig: false, type: "direct"   },
    { d: "Pulmonary aspiration",                    r:  0.028, sig: false, type: "direct"   },
    { d: "Resp. infections and tuberculosis",       r: -0.155, sig: false, type: "strong"   },
    { d: "Tracheal, bronchus, and lung cancer",     r: -0.205, sig: true,  type: "direct"   },
    { d: "Stroke",                                  r: -0.326, sig: true,  type: "direct"   },
    { d: "Ischemic stroke",                         r: -0.329, sig: true,  type: "direct"   },
    { d: "Interstitial lung disease",               r: -0.330, sig: true,  type: "direct"   },
    { d: "PAH",                                     r: -0.347, sig: true,  type: "direct"   },
    { d: "Ischemic heart disease",                  r: -0.427, sig: true,  type: "direct"   },
    { d: "Cardiovascular diseases",                 r: -0.555, sig: true,  type: "direct"   },
    { d: "Hypertensive heart disease",              r: -0.556, sig: true,  type: "direct"   },
    { d: "Atrial fibrillation and flutter",         r: -0.577, sig: true,  type: "direct"   },
  ],

  // Source: taskb_regression_results.csv — train R², top 8 by train_r2
  // These are TRAINING set R² values. Test R² values are substantially lower
  // (model trained 2010-2019, tested 2020-2023).
  taskb: [
    { d: "Neonatal encephalopathy",  r2: 0.710 },
    { d: "Upper resp. infections",   r2: 0.673 },
    { d: "Atrial fibrillation",      r2: 0.552 },
    { d: "Neonatal preterm",         r2: 0.519 },
    { d: "Resp. infections & TB",    r2: 0.484 },
    { d: "Lower resp. infections",   r2: 0.457 },
    { d: "Cardiovascular",           r2: 0.446 },
    { d: "Hypertensive heart",       r2: 0.434 },
  ],

  // Source: phase5_model_summary.csv
  taskA_metrics: {
    model:         "Random Forest",
    test_r2:       0.5943,
    test_mae:      16.04,
    lr_test_r2:    0.4775,
    lr_test_mae:   19.60,
    train_samples: 1203,
    test_samples:  1202,
    train_years:   "up to 2020",
    test_years:    "2021+",
  },

  // Source: phase5_model_summary.csv features column (verbatim)
  features: [
    { key: "PM25_lag1",          label: "PM2.5 — previous month"  },
    { key: "PM25_lag2",          label: "PM2.5 — 2 months prior"  },
    { key: "AT (degree C)_mean", label: "Air Temperature (°C)"    },
    { key: "RH (%)_mean",        label: "Relative Humidity (%)"   },
    { key: "WS (m/s)_mean",      label: "Wind Speed (m/s)"        },
    { key: "RF (mm)_mean",       label: "Rainfall (mm)"           },
    { key: "month_sin",          label: "Seasonal cycle — sin"    },
    { key: "month_cos",          label: "Seasonal cycle — cos"    },
    { key: "year",               label: "Year (trend)"            },
  ],
};