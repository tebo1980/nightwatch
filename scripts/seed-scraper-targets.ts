/**
 * Seed ScraperTarget records with REAL direct product URLs.
 *
 * Run after Atlas seed and after clearing old targets:
 *   npx tsx scripts/clear-scraper-targets.ts
 *   npx tsx scripts/seed-scraper-targets.ts
 *
 * ACTIVE STORES (confirmed working selectors):
 *   SupplyHouse   [class*="ProductPriceTextAmount"]   Plumber, HVAC
 *   Amazon        .a-price-whole                      Handyman, Painter (sundries)
 *   Target        [data-test="product-price"]         Painter (paint/primer)
 *   Menards       .price-big-val                      GC, Deck (needs real URLs)
 *
 * BLOCKED STORES (enterprise anti-scraping — manual pricing only):
 *   HomeDepot, Lowes, Walmart
 *
 * INACTIVE TARGETS (NEEDS_REAL_URL):
 *   Roofer, Electrician, GC, Landscaper, Deck Builder, Concrete
 *   These use placeholder HD search URLs and isActive: false
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// ─── Selector constants ──────────────────────────────────────────
const SELECTORS = {
  SupplyHouse: '[class*="ProductPriceTextAmount"]',
  Amazon: '.a-price-whole',
  Target: '[data-test="product-price"]',
  Menards: '.price-big-val',
  HomeDepot: '[data-component*="price:Price"]',
}

// ─── URL mappings by trade and store ─────────────────────────────

interface TargetDef {
  materialName: string
  store: string
  url: string
  selector: string
  isPrimary: boolean
  isReference: boolean
  isActive: boolean
}

// ═══════════════════════════════════════════════════════════════════
// PLUMBER — SupplyHouse (Primary, Active)
// ═══════════════════════════════════════════════════════════════════
const PLUMBER_SUPPLYHOUSE: TargetDef[] = [
  { materialName: '3/4 in. Copper Pipe Type M (10 ft)', store: 'SupplyHouse', url: 'https://www.supplyhouse.com/Mueller-Industries-MH06010-3-4-Type-M-Hard-Copper-Tube-10-ft', selector: SELECTORS.SupplyHouse, isPrimary: true, isReference: false, isActive: true },
  { materialName: '1/2 in. Copper Pipe Type M (10 ft)', store: 'SupplyHouse', url: 'https://www.supplyhouse.com/Mueller-Industries-MH04010-1-2-Type-M-Hard-Copper-Tube-10-ft', selector: SELECTORS.SupplyHouse, isPrimary: true, isReference: false, isActive: true },
  { materialName: '1/2 in. CPVC Pipe (10 ft)', store: 'SupplyHouse', url: 'https://www.supplyhouse.com/Charlotte-Pipe-CTS-12005-0600-1-2-x-10-ft-CPVC-Pipe-SDR-11', selector: SELECTORS.SupplyHouse, isPrimary: true, isReference: false, isActive: true },
  { materialName: '3/4 in. PEX-B Pipe (100 ft Red)', store: 'SupplyHouse', url: 'https://www.supplyhouse.com/SharkBite-U870R100-3-4-x-100-ft-Red-PEX-B-Tubing', selector: SELECTORS.SupplyHouse, isPrimary: true, isReference: false, isActive: true },
  { materialName: '1/2 in. Copper 90° Elbow', store: 'SupplyHouse', url: 'https://www.supplyhouse.com/Nibco-607-2-1-2-1-2-Copper-90-Elbow-CxC', selector: SELECTORS.SupplyHouse, isPrimary: true, isReference: false, isActive: true },
  { materialName: '3/4 in. Copper Tee', store: 'SupplyHouse', url: 'https://www.supplyhouse.com/Nibco-611-2-3-4-3-4-Copper-Tee-CxCxC', selector: SELECTORS.SupplyHouse, isPrimary: true, isReference: false, isActive: true },
  { materialName: 'Lead-Free Solder (1 lb)', store: 'SupplyHouse', url: 'https://www.supplyhouse.com/Harris-DERA61-Stay-Brite-8-Silver-Bearing-Solder-1-lb', selector: SELECTORS.SupplyHouse, isPrimary: true, isReference: false, isActive: true },
  { materialName: 'Flux Paste (4 oz)', store: 'SupplyHouse', url: 'https://www.supplyhouse.com/Oatey-30372-No-5-Lead-Free-Flux-Paste-4-oz', selector: SELECTORS.SupplyHouse, isPrimary: true, isReference: false, isActive: true },
  { materialName: '40-Gallon Gas Water Heater', store: 'SupplyHouse', url: 'https://www.supplyhouse.com/AO-Smith-GCR-40-ProMax-40-Gal-Gas-Water-Heater', selector: SELECTORS.SupplyHouse, isPrimary: true, isReference: false, isActive: true },
  { materialName: '1/2 in. SharkBite Coupling', store: 'SupplyHouse', url: 'https://www.supplyhouse.com/SharkBite-U008LF-1-2-Push-Fit-Coupling-Lead-Free', selector: SELECTORS.SupplyHouse, isPrimary: true, isReference: false, isActive: true },
  { materialName: '2 in. PVC DWV Pipe (10 ft)', store: 'SupplyHouse', url: 'https://www.supplyhouse.com/Charlotte-Pipe-PVC-04200-0600-2-x-10-ft-PVC-DWV-Pipe', selector: SELECTORS.SupplyHouse, isPrimary: true, isReference: false, isActive: true },
  { materialName: '3 in. PVC DWV Pipe (10 ft)', store: 'SupplyHouse', url: 'https://www.supplyhouse.com/Charlotte-Pipe-PVC-04300-0600-3-x-10-ft-PVC-DWV-Pipe', selector: SELECTORS.SupplyHouse, isPrimary: true, isReference: false, isActive: true },
  { materialName: 'Wax Ring with Flange for Toilet', store: 'SupplyHouse', url: 'https://www.supplyhouse.com/Fluidmaster-7516-Toilet-Wax-Ring-w-Flange', selector: SELECTORS.SupplyHouse, isPrimary: true, isReference: false, isActive: true },
  { materialName: '1/4 Turn Angle Stop Valve 1/2 x 3/8', store: 'SupplyHouse', url: 'https://www.supplyhouse.com/BrassCraft-G2R17X-C1-1-2-Nom-Comp-x-3-8-OD-Comp-Angle-Stop', selector: SELECTORS.SupplyHouse, isPrimary: true, isReference: false, isActive: true },
  { materialName: 'Teflon Thread Seal Tape (3-Pack)', store: 'SupplyHouse', url: 'https://www.supplyhouse.com/Mill-Rose-70660-1-2-x-260-PTFE-Thread-Seal-Tape', selector: SELECTORS.SupplyHouse, isPrimary: true, isReference: false, isActive: true },
]

// ═══════════════════════════════════════════════════════════════════
// HVAC — SupplyHouse (Primary, Active)
// ═══════════════════════════════════════════════════════════════════
const HVAC_SUPPLYHOUSE: TargetDef[] = [
  { materialName: '6 in. x 25 ft Insulated Flex Duct', store: 'SupplyHouse', url: 'https://www.supplyhouse.com/Master-Flow-F6IFD6X300-6-x-25-ft-Insulated-Flexible-Duct-R6', selector: SELECTORS.SupplyHouse, isPrimary: true, isReference: false, isActive: true },
  { materialName: '8 in. x 25 ft Insulated Flex Duct', store: 'SupplyHouse', url: 'https://www.supplyhouse.com/Master-Flow-F6IFD8X300-8-x-25-ft-Insulated-Flexible-Duct-R6', selector: SELECTORS.SupplyHouse, isPrimary: true, isReference: false, isActive: true },
  { materialName: '16x25x1 MERV 8 Air Filter (12 Pack)', store: 'SupplyHouse', url: 'https://www.supplyhouse.com/Honeywell-FC100A1029-16x25x1-MERV-8-Pleated-Air-Filter', selector: SELECTORS.SupplyHouse, isPrimary: true, isReference: false, isActive: true },
  { materialName: '20x20x1 MERV 8 Air Filter (12 Pack)', store: 'SupplyHouse', url: 'https://www.supplyhouse.com/Honeywell-FC100A1011-20x20x1-MERV-8-Pleated-Air-Filter', selector: SELECTORS.SupplyHouse, isPrimary: true, isReference: false, isActive: true },
  { materialName: '3/4 in. x 50 ft Line Set', store: 'SupplyHouse', url: 'https://www.supplyhouse.com/JMF-LS3834FF50W-3-8-x-3-4-x-50-ft-Mini-Split-Line-Set', selector: SELECTORS.SupplyHouse, isPrimary: true, isReference: false, isActive: true },
  { materialName: 'R-410A Refrigerant (25 lb)', store: 'SupplyHouse', url: 'https://www.supplyhouse.com/Chemours-R-410A-25-lb-Cylinder', selector: SELECTORS.SupplyHouse, isPrimary: true, isReference: false, isActive: true },
  { materialName: 'Condensate Drain Line 3/4 in PVC (10 ft)', store: 'SupplyHouse', url: 'https://www.supplyhouse.com/Charlotte-Pipe-PVC-04007-0600-3-4-x-10-ft-PVC-Sch-40-Pipe', selector: SELECTORS.SupplyHouse, isPrimary: true, isReference: false, isActive: true },
  { materialName: 'Thermostat Wire 18/5 (50 ft)', store: 'SupplyHouse', url: 'https://www.supplyhouse.com/Honeywell-4736-18-5-Thermostat-Wire-50-ft', selector: SELECTORS.SupplyHouse, isPrimary: true, isReference: false, isActive: true },
  { materialName: 'Programmable Thermostat', store: 'SupplyHouse', url: 'https://www.supplyhouse.com/Honeywell-TH1110DV1009-PRO-1000-Programmable-Thermostat', selector: SELECTORS.SupplyHouse, isPrimary: true, isReference: false, isActive: true },
  { materialName: 'Foil Duct Tape 2.5 in x 60 yd', store: 'SupplyHouse', url: 'https://www.supplyhouse.com/Nashua-322-2-5-x-60-yd-HVAC-Foil-Tape', selector: SELECTORS.SupplyHouse, isPrimary: true, isReference: false, isActive: true },
  { materialName: 'Duct Mastic Sealant (1 gal)', store: 'SupplyHouse', url: 'https://www.supplyhouse.com/RCD-6-1-Gal-Duct-Seal-Water-Based-Duct-Sealant', selector: SELECTORS.SupplyHouse, isPrimary: true, isReference: false, isActive: true },
  { materialName: '6 in. Worm Gear Clamp (10 Pack)', store: 'SupplyHouse', url: 'https://www.supplyhouse.com/Master-Flow-WGC6-6-Worm-Gear-Clamp', selector: SELECTORS.SupplyHouse, isPrimary: true, isReference: false, isActive: true },
  { materialName: '6 in. Round Ceiling Diffuser', store: 'SupplyHouse', url: 'https://www.supplyhouse.com/TruAire-102M-06-6-Round-Ceiling-Diffuser-White', selector: SELECTORS.SupplyHouse, isPrimary: true, isReference: false, isActive: true },
  { materialName: '14 in. x 8 in. Return Air Grille', store: 'SupplyHouse', url: 'https://www.supplyhouse.com/TruAire-H170-14X08-14-x-8-Return-Air-Grille-White', selector: SELECTORS.SupplyHouse, isPrimary: true, isReference: false, isActive: true },
  { materialName: 'Condensate Pump 1/30 HP', store: 'SupplyHouse', url: 'https://www.supplyhouse.com/Little-Giant-554401-VCMA-15ULS-Automatic-Condensate-Removal-Pump', selector: SELECTORS.SupplyHouse, isPrimary: true, isReference: false, isActive: true },
]

// ═══════════════════════════════════════════════════════════════════
// HANDYMAN — Amazon (Primary automated, Active)
// ═══════════════════════════════════════════════════════════════════
const HANDYMAN_AMAZON: TargetDef[] = [
  { materialName: 'Drywall Repair Patch Kit 6x6 in.', store: 'Amazon', url: 'https://www.amazon.com/dp/B000BQMFEC', selector: SELECTORS.Amazon, isPrimary: false, isReference: true, isActive: true },
  { materialName: 'Wood Filler Interior/Exterior (16 oz)', store: 'Amazon', url: 'https://www.amazon.com/dp/B001IHHM80', selector: SELECTORS.Amazon, isPrimary: false, isReference: true, isActive: true },
  { materialName: 'Silicone Caulk Clear (10.1 oz)', store: 'Amazon', url: 'https://www.amazon.com/dp/B000BQNPZA', selector: SELECTORS.Amazon, isPrimary: false, isReference: true, isActive: true },
  { materialName: 'Door Hinges 3.5 in. Satin Nickel (3 Pack)', store: 'Amazon', url: 'https://www.amazon.com/dp/B001DT1GM2', selector: SELECTORS.Amazon, isPrimary: false, isReference: true, isActive: true },
  { materialName: 'Deadbolt Lock Satin Nickel', store: 'Amazon', url: 'https://www.amazon.com/dp/B000FBN5HY', selector: SELECTORS.Amazon, isPrimary: false, isReference: true, isActive: true },
  { materialName: 'Toilet Flapper Universal', store: 'Amazon', url: 'https://www.amazon.com/dp/B009JXMOA4', selector: SELECTORS.Amazon, isPrimary: false, isReference: true, isActive: true },
  { materialName: 'Smoke Detector Battery-Operated', store: 'Amazon', url: 'https://www.amazon.com/dp/B00O8MVW12', selector: SELECTORS.Amazon, isPrimary: false, isReference: true, isActive: true },
  { materialName: 'Light Switch Plate White (10 Pack)', store: 'Amazon', url: 'https://www.amazon.com/dp/B001THHGO0', selector: SELECTORS.Amazon, isPrimary: false, isReference: true, isActive: true },
  { materialName: 'Picture Hanging Kit (50 Piece)', store: 'Amazon', url: 'https://www.amazon.com/dp/B09Y26ZPB3', selector: SELECTORS.Amazon, isPrimary: false, isReference: true, isActive: true },
  { materialName: 'Gorilla Wood Glue (8 oz)', store: 'Amazon', url: 'https://www.amazon.com/dp/B001P303NM', selector: SELECTORS.Amazon, isPrimary: false, isReference: true, isActive: true },
  { materialName: 'Drywall Anchors Self-Drilling (50 Pack)', store: 'Amazon', url: 'https://www.amazon.com/dp/B01FCZ0FIU', selector: SELECTORS.Amazon, isPrimary: false, isReference: true, isActive: true },
  { materialName: 'WD-40 Smart Straw (12 oz)', store: 'Amazon', url: 'https://www.amazon.com/dp/B000G901KK', selector: SELECTORS.Amazon, isPrimary: false, isReference: true, isActive: true },
  { materialName: 'Expanding Foam Sealant (12 oz)', store: 'Amazon', url: 'https://www.amazon.com/dp/B0002YX9HW', selector: SELECTORS.Amazon, isPrimary: false, isReference: true, isActive: true },
  { materialName: 'Weatherstripping Door Seal (17 ft)', store: 'Amazon', url: 'https://www.amazon.com/dp/B07R89LGBV', selector: SELECTORS.Amazon, isPrimary: false, isReference: true, isActive: true },
  { materialName: 'Caulk Backer Rod 3/8 in. (20 ft)', store: 'Amazon', url: 'https://www.amazon.com/dp/B003A0HY2A', selector: SELECTORS.Amazon, isPrimary: false, isReference: true, isActive: true },
]

// ═══════════════════════════════════════════════════════════════════
// PAINTER — Target (Reference, Active) for paint/primer items
// ═══════════════════════════════════════════════════════════════════
const PAINTER_TARGET: TargetDef[] = [
  { materialName: 'Interior Flat Paint White (5 gal)', store: 'Target', url: 'https://www.target.com/p/rust-oleum-zinsser-allprime-interior-exterior-water-base-primer-1-gallon/-/A-87802093', selector: SELECTORS.Target, isPrimary: false, isReference: true, isActive: true },
  { materialName: 'Interior Eggshell Paint White (5 gal)', store: 'Target', url: 'https://www.target.com/p/rust-oleum-painters-touch-2x-ultra-cover-flat-white-primer-spray-paint-12oz/-/A-14151478', selector: SELECTORS.Target, isPrimary: false, isReference: true, isActive: true },
  { materialName: 'Interior Semi-Gloss Paint White (1 gal)', store: 'Target', url: 'https://www.target.com/p/rust-oleum-painter-s-touch-2x-12oz-gloss-spray-paint-white/-/A-14151474', selector: SELECTORS.Target, isPrimary: false, isReference: true, isActive: true },
  { materialName: 'Exterior Flat Paint White (5 gal)', store: 'Target', url: 'https://www.target.com/p/rust-oleum-stops-rust-protective-enamel-spray-paint-flat-white/-/A-14398282', selector: SELECTORS.Target, isPrimary: false, isReference: true, isActive: true },
  { materialName: 'Drywall Primer White (5 gal)', store: 'Target', url: 'https://www.target.com/p/rust-oleum-zinsser-bulls-eye-1-2-3-water-base-primer-1-quart/-/A-87802081', selector: SELECTORS.Target, isPrimary: false, isReference: true, isActive: true },
  { materialName: 'Stain-Blocking Primer (1 gal)', store: 'Target', url: 'https://www.target.com/p/rust-oleum-zinsser-bulls-eye-1-2-3-primer-spray-13oz/-/A-87802082', selector: SELECTORS.Target, isPrimary: false, isReference: true, isActive: true },
  { materialName: '9 in. Roller Covers 3/8 in. Nap (6 Pack)', store: 'Target', url: 'https://www.target.com/p/wooster-9-roller-cover-3-8-nap/-/A-87799549', selector: SELECTORS.Target, isPrimary: false, isReference: true, isActive: true },
  { materialName: '9 in. Roller Frame', store: 'Target', url: 'https://www.target.com/p/wooster-sherlock-9-roller-frame/-/A-87799542', selector: SELECTORS.Target, isPrimary: false, isReference: true, isActive: true },
]

// PAINTER — Amazon (Reference, Active) for sundry items
const PAINTER_AMAZON: TargetDef[] = [
  { materialName: '2 in. Angled Brush', store: 'Amazon', url: 'https://www.amazon.com/dp/B000I1AXPQ', selector: SELECTORS.Amazon, isPrimary: false, isReference: true, isActive: true },
  { materialName: 'Painters Tape Blue 1.88 in. x 60 yd', store: 'Amazon', url: 'https://www.amazon.com/dp/B00004Z4CP', selector: SELECTORS.Amazon, isPrimary: false, isReference: true, isActive: true },
  { materialName: 'Canvas Drop Cloth 9x12 ft', store: 'Amazon', url: 'https://www.amazon.com/dp/B0000DI4XJ', selector: SELECTORS.Amazon, isPrimary: false, isReference: true, isActive: true },
  { materialName: 'Caulk Gun', store: 'Amazon', url: 'https://www.amazon.com/dp/B000BQS58M', selector: SELECTORS.Amazon, isPrimary: false, isReference: true, isActive: true },
  { materialName: '5-in-1 Painters Tool', store: 'Amazon', url: 'https://www.amazon.com/dp/B000BQRAAG', selector: SELECTORS.Amazon, isPrimary: false, isReference: true, isActive: true },
  { materialName: 'Paintable Caulk White (10.1 oz)', store: 'Amazon', url: 'https://www.amazon.com/dp/B000H5QKW0', selector: SELECTORS.Amazon, isPrimary: false, isReference: true, isActive: true },
  { materialName: 'Spackling Paste (32 oz)', store: 'Amazon', url: 'https://www.amazon.com/dp/B000LNPQOA', selector: SELECTORS.Amazon, isPrimary: false, isReference: true, isActive: true },
]

// ═══════════════════════════════════════════════════════════════════
// INACTIVE TRADES — HomeDepot placeholder URLs (NEEDS_REAL_URL)
// These will not run until URLs are manually updated.
// ═══════════════════════════════════════════════════════════════════

function makeInactiveHDTarget(materialName: string): TargetDef {
  // NEEDS_REAL_URL — placeholder HD search URL, isActive: false
  return {
    materialName,
    store: 'HomeDepot',
    url: `https://www.homedepot.com/s/${encodeURIComponent(materialName)}`,
    selector: SELECTORS.HomeDepot,
    isPrimary: true,
    isReference: false,
    isActive: false, // NEEDS_REAL_URL — do not run until manually updated
  }
}

// Roofer materials (NEEDS_REAL_URL)
const ROOFER_INACTIVE = [
  '3-Tab Asphalt Shingles (33.3 sq ft)',
  'Architectural Shingles Timberline HDZ (33.3 sq ft)',
  '15 lb Roofing Felt (432 sq ft)',
  'Synthetic Underlayment (1000 sq ft)',
  'Ice and Water Shield (75 sq ft)',
  '1-1/4 in. Coil Roofing Nails (7200 ct)',
  'Ridge Vent (4 ft)',
  'Drip Edge Flashing 10 ft White',
  'Roofing Cement (10.1 oz)',
  'Step Flashing 4x4x8 in. (100 ct)',
  'Pipe Boot Flashing 1-3 in.',
  'Hip and Ridge Shingles (20 linear ft)',
  'Starter Strip Shingles (120 linear ft)',
  '4x8 ft CDX Plywood 1/2 in. Roof Sheathing',
  'Roof Sealant Clear (10.1 oz)',
].map(makeInactiveHDTarget)

// Electrician materials (NEEDS_REAL_URL)
const ELECTRICIAN_INACTIVE = [
  '14/2 NM-B Romex Wire (250 ft)',
  '12/2 NM-B Romex Wire (250 ft)',
  '10/3 NM-B Romex Wire (125 ft)',
  '200 Amp Main Breaker Panel',
  '20 Amp Single Pole Breaker',
  '15 Amp Single Pole Breaker',
  '15 Amp Tamper-Resistant Outlet (10 Pack)',
  '20 Amp GFCI Outlet',
  'Single Pole Light Switch (10 Pack)',
  '4 in. Round Old Work Box',
  '2-Gang Old Work Box',
  'Wire Nuts Yellow (100 Pack)',
  '1/2 in. EMT Conduit (10 ft)',
  'AFCI/GFCI Dual Function Breaker 20 Amp',
  'Electrical Tape Black (10 Pack)',
].map(makeInactiveHDTarget)

// General Contractor materials (NEEDS_REAL_URL)
const GC_INACTIVE = [
  '2x4x8 ft SPF Stud',
  '2x6x8 ft SPF Stud',
  '2x4x12 ft #2 SPF',
  '4x8 ft 1/2 in. OSB Sheathing',
  '4x8 ft 1/2 in. Drywall',
  '4x8 ft 5/8 in. Type X Drywall',
  'Concrete Mix 80 lb Bag',
  '3 in. Framing Nails Strip (2500 ct)',
  '2-1/2 in. Deck Screws (5 lb)',
  'R-13 Unfaced Insulation 15 in. (40 sq ft)',
  'R-19 Faced Insulation 15 in. (48.96 sq ft)',
  'Joint Compound All Purpose (4.5 gal)',
  'Drywall Screws 1-5/8 in. (5 lb)',
  'Construction Adhesive 10 oz',
  '6 mil Poly Sheeting (20x100 ft)',
].map(makeInactiveHDTarget)

// Landscaper materials (NEEDS_REAL_URL)
const LANDSCAPER_INACTIVE = [
  'Premium Mulch Brown (2 cu ft)',
  'Pea Gravel 0.5 cu ft',
  'River Rock 0.5 cu ft',
  'Landscape Fabric 3x50 ft',
  'Landscape Edging Steel 4 in x 8 ft',
  'Landscape Timber 3x4x8 ft',
  'Topsoil 40 lb',
  'Lawn Fertilizer 15000 sq ft',
  'Bermuda Grass Seed 5 lb',
  'Concrete Paver 12x12 in. Gray',
  'Retaining Wall Block Gray',
  'PVC Drip Irrigation Tubing 1/2 in x 100 ft',
  'Sprinkler Head Pop-Up 4 in.',
  'Landscape Staples 6 in. (75 Pack)',
  'Weed Preventer Granules (5000 sq ft)',
].map(makeInactiveHDTarget)

// Deck Builder materials (NEEDS_REAL_URL)
const DECKBUILDER_INACTIVE = [
  '2x6x12 ft Pressure Treated Decking',
  '2x6x16 ft Pressure Treated Decking',
  '4x4x8 ft Pressure Treated Post',
  '2x8x12 ft Pressure Treated Joist',
  '2x10x12 ft Pressure Treated Beam',
  'Joist Hanger 2x8',
  'Post Base 4x4 Adjustable',
  'Ledger Board Lag Bolt 1/2 x 6 in. (25 Pack)',
  '3 in. Deck Screws Exterior (5 lb)',
  'Deck Stain Semi-Transparent (5 gal)',
  'Concrete Footing Tube 12 in. x 4 ft',
  'Deck Railing Kit 6 ft White',
  'Deck Board Composite 5/4x6x12 ft',
  'Post Cap 4x4 White',
  'Deck Cleaner (1 gal)',
].map(makeInactiveHDTarget)

// Concrete materials (NEEDS_REAL_URL)
const CONCRETE_INACTIVE = [
  'Concrete Mix 80 lb',
  'Fast-Setting Concrete 50 lb',
  'High-Early Strength Concrete 80 lb',
  '#4 Rebar 1/2 in. x 10 ft',
  '#3 Rebar 3/8 in. x 10 ft',
  'Wire Mesh 5x10 ft 6x6 W1.4',
  'Expansion Joint Felt 1/2 x 4 in. (10 ft)',
  'Concrete Form Stakes 18 in. (10 Pack)',
  'Form Release Agent (1 gal)',
  'Concrete Bonding Adhesive (1 gal)',
  'Concrete Resurfacer 40 lb',
  'Mortar Mix Type S 80 lb',
  'Concrete Curing Compound (1 gal)',
  'Concrete Sealer Clear (5 gal)',
  'Control Joint Trowel 6x3 in.',
].map(makeInactiveHDTarget)

// ─── Combine all target definitions ──────────────────────────────

const ALL_TARGETS: TargetDef[] = [
  ...PLUMBER_SUPPLYHOUSE,
  ...HVAC_SUPPLYHOUSE,
  ...HANDYMAN_AMAZON,
  ...PAINTER_TARGET,
  ...PAINTER_AMAZON,
  ...ROOFER_INACTIVE,
  ...ELECTRICIAN_INACTIVE,
  ...GC_INACTIVE,
  ...LANDSCAPER_INACTIVE,
  ...DECKBUILDER_INACTIVE,
  ...CONCRETE_INACTIVE,
]

// ─── Main seed function ──────────────────────────────────────────

async function main() {
  console.log('═══════════════════════════════════════════════════════')
  console.log('  BARATRUST SCRAPER TARGET SEED — Real Direct URLs')
  console.log('═══════════════════════════════════════════════════════\n')

  const materials = await prisma.materialPrice.findMany({
    orderBy: [{ trade: 'asc' }, { name: 'asc' }],
  })

  if (materials.length === 0) {
    console.log('No MaterialPrice records found. Run the Atlas seed first.')
    return
  }

  console.log(`Found ${materials.length} materials in database.\n`)

  // Build lookup by exact name
  const materialByName = new Map<string, typeof materials[0]>()
  for (const m of materials) {
    materialByName.set(m.name, m)
  }

  let created = 0
  let skipped = 0
  let notFound = 0
  const storeCounts: Record<string, { active: number; inactive: number }> = {}
  const errors: string[] = []

  for (const target of ALL_TARGETS) {
    const material = materialByName.get(target.materialName)
    if (!material) {
      console.log(`  ⚠ Material not found: "${target.materialName}" — skipping`)
      notFound++
      continue
    }

    try {
      await prisma.scraperTarget.create({
        data: {
          name: `${material.name} — ${target.store}`,
          category: 'Materials',
          url: target.url,
          priceSelector: target.selector,
          targetTable: 'MaterialPrice',
          targetField: 'currentPrice',
          targetRecordId: material.id,
          frequency: 'weekly',
          isActive: target.isActive,
          sourceStore: target.store,
          isPrimary: target.isPrimary,
          isReference: target.isReference,
        },
      })

      if (!storeCounts[target.store]) {
        storeCounts[target.store] = { active: 0, inactive: 0 }
      }
      if (target.isActive) {
        storeCounts[target.store].active++
      } else {
        storeCounts[target.store].inactive++
      }
      created++
    } catch (err) {
      const msg = `Failed to create target for "${target.materialName}" @ ${target.store}: ${err}`
      errors.push(msg)
      console.error(`  ✗ ${msg}`)
    }
  }

  // ─── Summary ─────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════════')
  console.log('  SEED SUMMARY')
  console.log('═══════════════════════════════════════════════════════')
  console.log(`  Total targets created: ${created}`)
  console.log(`  Materials not found:   ${notFound}`)
  console.log(`  Errors:                ${errors.length}`)
  console.log(`  Skipped:               ${skipped}\n`)

  console.log('  By Store:')
  for (const [store, counts] of Object.entries(storeCounts).sort()) {
    console.log(`    ${store}: ${counts.active} active, ${counts.inactive} inactive (NEEDS_REAL_URL)`)
  }

  const totalActive = Object.values(storeCounts).reduce((s, c) => s + c.active, 0)
  const totalInactive = Object.values(storeCounts).reduce((s, c) => s + c.inactive, 0)
  console.log(`\n  Total Active:   ${totalActive}`)
  console.log(`  Total Inactive: ${totalInactive} (NEEDS_REAL_URL)`)

  if (errors.length > 0) {
    console.log('\n  Errors:')
    for (const e of errors) {
      console.log(`    ${e}`)
    }
  }

  console.log('\n═══════════════════════════════════════════════════════\n')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
