/**
 * Trylo.pk  -  Development seed data
 *
 * PURPOSE: Creates realistic pilot data so the team can test search, swipe flow,
 * recommendations, and layout without waiting for real seller onboarding.
 *
 * IMAGE POLICY (non-negotiable per CLAUDE.md constraint #1):
 * All product images use an honest placeholder  -  a solid-colour rectangle with
 * the product name. These are NOT scraped or stock images. Real product photos
 * must come from verified sellers who own the rights. This seed is for dev/pilot
 * only and must never be deployed to production with placeholder images live.
 *
 * Run with:  npm run db:seed
 * Re-running is safe  -  it clears and re-seeds.
 */

import { PrismaClient, Department, VerificationStatus, ProductStatus, Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns a placeholder image URL  -  a clearly-labeled coloured rectangle. */
function placeholder(label: string, bgHex: string, w = 800, h = 1000): string {
  const encoded = encodeURIComponent(label.slice(0, 60));
  return `https://placehold.co/${w}x${h}/${bgHex}/ffffff?text=${encoded}`;
}

/** Price in paisa (PKR - 100). Avoids float math. */
const pkr = (rupees: number) => rupees * 100;

// ---------------------------------------------------------------------------
// Taxonomy data
// ---------------------------------------------------------------------------

type SubStyleSeed = { name: string; slug: string };
type CategorySeed = {
  name: string;
  slug: string;
  department: Department;
  subStyles: SubStyleSeed[];
};

const TAXONOMY: CategorySeed[] = [
  // -- Women's --------------------------------------------------------------
  {
    name: 'Lawn', slug: 'lawn', department: Department.WOMEN,
    subStyles: [
      { name: 'Printed Lawn', slug: 'printed-lawn' },
      { name: 'Embroidered Lawn', slug: 'embroidered-lawn' },
      { name: 'Digital Print Lawn', slug: 'digital-print-lawn' },
      { name: 'Plain Lawn', slug: 'plain-lawn' },
      { name: 'Lawn 3-Piece', slug: 'lawn-3piece' },
      { name: 'Premium Lawn', slug: 'premium-lawn' },
    ],
  },
  {
    name: 'Kameez', slug: 'kameez', department: Department.WOMEN,
    subStyles: [
      { name: 'Casual Kameez', slug: 'casual-kameez' },
      { name: 'Formal Kameez', slug: 'formal-kameez' },
      { name: 'Embroidered Kameez', slug: 'embroidered-kameez' },
      { name: 'Chiffon Kameez', slug: 'chiffon-kameez' },
      { name: 'Cotton Kameez', slug: 'cotton-kameez' },
    ],
  },
  {
    name: 'Kurta', slug: 'kurta', department: Department.WOMEN,
    subStyles: [
      { name: 'Short Kurta', slug: 'short-kurta' },
      { name: 'Long Kurta', slug: 'long-kurta' },
      { name: 'Printed Kurta', slug: 'printed-kurta' },
      { name: 'Festive Kurta', slug: 'festive-kurta' },
      { name: 'Casual Kurta', slug: 'casual-kurta' },
    ],
  },
  {
    name: 'Abaya', slug: 'abaya', department: Department.WOMEN,
    subStyles: [
      { name: 'Open-Front Abaya', slug: 'open-front-abaya' },
      { name: 'Formal Abaya', slug: 'formal-abaya' },
      { name: 'Embroidered Abaya', slug: 'embroidered-abaya' },
      { name: 'Nida Abaya', slug: 'nida-abaya' },
      { name: 'Dubai Abaya', slug: 'dubai-abaya' },
      { name: 'Casual Abaya', slug: 'casual-abaya' },
    ],
  },
  {
    name: 'Bridal', slug: 'bridal', department: Department.WOMEN,
    subStyles: [
      { name: 'Bridal Lehenga', slug: 'bridal-lehenga' },
      { name: 'Bridal Gharara', slug: 'bridal-gharara' },
      { name: 'Bridal Saree', slug: 'bridal-saree' },
      { name: 'Walima Gown', slug: 'walima-gown' },
      { name: 'Bridal Maxi', slug: 'bridal-maxi' },
      { name: 'Nikah Outfit', slug: 'nikah-outfit' },
    ],
  },
  {
    name: 'Lehenga', slug: 'lehenga', department: Department.WOMEN,
    subStyles: [
      { name: 'Party Lehenga', slug: 'party-lehenga' },
      { name: 'Embroidered Lehenga', slug: 'embroidered-lehenga' },
      { name: 'Casual Lehenga', slug: 'casual-lehenga' },
      { name: 'Net Lehenga', slug: 'net-lehenga' },
    ],
  },
  {
    name: 'Anarkali', slug: 'anarkali', department: Department.WOMEN,
    subStyles: [
      { name: 'Floor-Length Anarkali', slug: 'floor-length-anarkali' },
      { name: 'Short Anarkali', slug: 'short-anarkali' },
      { name: 'Embroidered Anarkali', slug: 'embroidered-anarkali' },
      { name: 'Party Anarkali', slug: 'party-anarkali' },
    ],
  },
  {
    name: 'Shoes', slug: 'shoes-women', department: Department.WOMEN,
    subStyles: [
      { name: 'Block Heels', slug: 'block-heels' },
      { name: 'Stiletto Heels', slug: 'stiletto-heels' },
      { name: 'Kitten Heels', slug: 'kitten-heels' },
      { name: 'Wedge Heels', slug: 'wedge-heels' },
      { name: 'Platform Heels', slug: 'platform-heels' },
      { name: 'Bridal Khussa', slug: 'bridal-khussa' },
      { name: 'Casual Khussa', slug: 'casual-khussa' },
      { name: 'Kolhapuri Flats', slug: 'kolhapuri-flats' },
      { name: 'Strappy Sandals', slug: 'strappy-sandals' },
      { name: 'Slip-On Loafers', slug: 'slip-on-loafers' },
    ],
  },
  // -- Men's -----------------------------------------------------------------
  {
    name: 'Shirt', slug: 'shirt', department: Department.MEN,
    subStyles: [
      { name: 'Formal Shirt', slug: 'formal-shirt' },
      { name: 'Casual Shirt', slug: 'casual-shirt' },
      { name: 'Printed Shirt', slug: 'printed-shirt' },
      { name: 'Linen Shirt', slug: 'linen-shirt' },
      { name: 'Polo Shirt', slug: 'polo-shirt' },
    ],
  },
  {
    name: 'Shalwar Kameez', slug: 'shalwar-kameez', department: Department.MEN,
    subStyles: [
      { name: 'Plain Shalwar Kameez', slug: 'plain-shalwar-kameez' },
      { name: 'Wash & Wear', slug: 'wash-and-wear' },
      { name: 'Embroidered Kurta Shalwar', slug: 'embroidered-kurta-shalwar' },
      { name: 'Cotton Shalwar Kameez', slug: 'cotton-shalwar-kameez' },
      { name: 'Linen Shalwar Kameez', slug: 'linen-shalwar-kameez' },
    ],
  },
  {
    name: 'Sherwani', slug: 'sherwani', department: Department.MEN,
    subStyles: [
      { name: 'Groom Sherwani', slug: 'groom-sherwani' },
      { name: 'Prince Coat', slug: 'prince-coat' },
      { name: 'Embroidered Sherwani', slug: 'embroidered-sherwani' },
      { name: 'Simple Sherwani', slug: 'simple-sherwani' },
      { name: 'Baraat Sherwani', slug: 'baraat-sherwani' },
    ],
  },
  {
    name: 'Shoes', slug: 'shoes-men', department: Department.MEN,
    subStyles: [
      { name: 'Oxford / Formal Shoes', slug: 'oxford-formal' },
      { name: 'Leather Loafers', slug: 'leather-loafers' },
      { name: 'Peshawari Chappal', slug: 'peshawari-chappal' },
      { name: 'Norozi Chappal', slug: 'norozi-chappal' },
      { name: 'Casual Sneakers', slug: 'casual-sneakers' },
      { name: 'Leather Boots', slug: 'leather-boots' },
      { name: 'Dress Monk Strap', slug: 'dress-monk-strap' },
    ],
  },
  {
    name: 'Waistcoat', slug: 'waistcoat', department: Department.MEN,
    subStyles: [
      { name: 'Embroidered Waistcoat', slug: 'embroidered-waistcoat' },
      { name: 'Plain Waistcoat', slug: 'plain-waistcoat' },
      { name: 'Velvet Waistcoat', slug: 'velvet-waistcoat' },
      { name: 'Cotton Waistcoat', slug: 'cotton-waistcoat' },
    ],
  },
];

// ---------------------------------------------------------------------------
// Product attribute type mirrors the Prisma enums
// ---------------------------------------------------------------------------

type ProductSeed = {
  title: string;
  description: string;
  priceMinor: number;
  pattern: 'PLAIN' | 'PRINTED' | 'EMBROIDERED' | 'EMBELLISHED';
  tone: 'WARM' | 'COOL' | 'NEUTRAL';
  brightness: 'LIGHT' | 'MID' | 'DARK';
  saturation: 'MUTED' | 'BRIGHT';
  formality: 'CASUAL' | 'SEMI_FORMAL' | 'FORMAL';
  coverage: 'MODEST' | 'FULL';
  cut: 'FITTED' | 'FLOWY' | 'STRAIGHT';
  silhouette: string;
  department: Department;
  categorySlug: string;
  subStyleSlug: string;
  sizes: string[];
  imageLabel: string;
  imageBg: string;
  attributesExtra?: Prisma.InputJsonValue;
};

// ---------------------------------------------------------------------------
// Women's shoes  -  comprehensive
// ---------------------------------------------------------------------------

const WOMENS_SHOES: ProductSeed[] = [
  // -- Block Heels --------------------------------------------------------
  {
    title: 'Nude Block Heel Pump',
    description: `A wardrobe essential. This nude block heel pump in smooth faux leather pairs with literally everything  -  jeans, trousers, shalwar kameez. The 3-inch block heel gives you height without the wobble of a stiletto, making it a go-to for long days at work or weddings where you'll be on your feet. The pointed toe elongates the leg. Padded footbed for comfort. Fits true to size.`,
    priceMinor: pkr(3200), pattern: 'PLAIN', tone: 'WARM', brightness: 'LIGHT',
    saturation: 'MUTED', formality: 'SEMI_FORMAL', coverage: 'FULL', cut: 'FITTED',
    silhouette: 'pump', department: Department.WOMEN, categorySlug: 'shoes-women',
    subStyleSlug: 'block-heels', sizes: ['36', '37', '38', '39', '40', '41'],
    imageLabel: 'Nude Block Heel Pump', imageBg: 'c9b5a0',
    attributesExtra: { heelHeightCm: 8, material: 'faux leather', closure: 'slip-on', toe: 'pointed' },
  },
  {
    title: 'Black Block Heel Mule',
    description: `The black block heel mule you'll reach for every other day. Open-toe design with a wide strap across the vamp keeps it modern without being flashy. 7 cm block heel is the sweet spot  -  enough for a formal look, comfortable enough for hours. Upper in matte black faux suede. Goes with everything from cigarette trousers to an embroidered kurta. Easy slip-in, no buckle fuss.`,
    priceMinor: pkr(2800), pattern: 'PLAIN', tone: 'NEUTRAL', brightness: 'DARK',
    saturation: 'MUTED', formality: 'SEMI_FORMAL', coverage: 'FULL', cut: 'FITTED',
    silhouette: 'mule', department: Department.WOMEN, categorySlug: 'shoes-women',
    subStyleSlug: 'block-heels', sizes: ['36', '37', '38', '39', '40'],
    imageLabel: 'Black Block Heel Mule', imageBg: '2a2a2a',
    attributesExtra: { heelHeightCm: 7, material: 'faux suede', closure: 'slip-on', toe: 'open' },
  },
  {
    title: 'Dusty Rose Block Heel Sandal',
    description: `Soft dusty rose block heel sandal with thin ankle strap and toe post. The muted pink sits beautifully against both fair and deeper skin tones and works under wide-leg trousers, palazzo pants, or maxi dresses. Cushioned sole keeps feet comfortable through a full evening. 6.5 cm stable block heel. Adjustable ankle buckle for a secure fit.`,
    priceMinor: pkr(3600), pattern: 'PLAIN', tone: 'WARM', brightness: 'LIGHT',
    saturation: 'MUTED', formality: 'SEMI_FORMAL', coverage: 'MODEST', cut: 'STRAIGHT',
    silhouette: 'sandal', department: Department.WOMEN, categorySlug: 'shoes-women',
    subStyleSlug: 'block-heels', sizes: ['36', '37', '38', '39', '40', '41'],
    imageLabel: 'Dusty Rose Block Heel Sandal', imageBg: 'd4a5a5',
    attributesExtra: { heelHeightCm: 6.5, material: 'faux leather', closure: 'ankle-buckle', toe: 'open' },
  },

  // -- Stiletto Heels -----------------------------------------------------
  {
    title: 'Classic Red Stiletto',
    description: `Every woman's power shoe. This classic red stiletto in glossy patent faux leather has a 10 cm heel and pointed toe  -  the silhouette that makes legs look their longest. Cut to a slim last that suits narrower feet. The bright cherry red makes it a statement piece whether it peeks out from under a formal trouser or is paired with a black cocktail shalwar. Non-slip sole.`,
    priceMinor: pkr(4500), pattern: 'PLAIN', tone: 'WARM', brightness: 'MID',
    saturation: 'BRIGHT', formality: 'FORMAL', coverage: 'FULL', cut: 'FITTED',
    silhouette: 'stiletto', department: Department.WOMEN, categorySlug: 'shoes-women',
    subStyleSlug: 'stiletto-heels', sizes: ['36', '37', '38', '39', '40'],
    imageLabel: 'Classic Red Stiletto Patent', imageBg: 'c0392b',
    attributesExtra: { heelHeightCm: 10, material: 'patent faux leather', closure: 'slip-on', toe: 'pointed' },
  },
  {
    title: 'Champagne Diamant- Stiletto',
    description: `The ultimate wedding guest shoe. Champagne-gold faux satin upper with a band of tiny diamant- stones across the vamp catches light beautifully under hall chandeliers. Slender 9 cm stiletto, pointed toe, padded insole to keep you comfortable through the reception. Pairs with everything from a pink lehnga to a silver formal suit. Comes in a dust bag.`,
    priceMinor: pkr(6800), pattern: 'EMBELLISHED', tone: 'WARM', brightness: 'LIGHT',
    saturation: 'BRIGHT', formality: 'FORMAL', coverage: 'FULL', cut: 'FITTED',
    silhouette: 'stiletto', department: Department.WOMEN, categorySlug: 'shoes-women',
    subStyleSlug: 'stiletto-heels', sizes: ['36', '37', '38', '39', '40'],
    imageLabel: 'Champagne Diamant- Stiletto', imageBg: 'c9a84c',
    attributesExtra: { heelHeightCm: 9, material: 'faux satin + diamant-', closure: 'slip-on', toe: 'pointed' },
  },
  {
    title: 'Nude Barely-There Stiletto',
    description: `Barely-there style: thin straps, nude faux leather, 9 cm stiletto. The ankle strap with a dainty buckle is all that holds this sandal on, which is the point  -  the less shoe visible, the longer the leg appears. Works brilliantly under formal shalwar or maxi dresses where you want the outfit, not the shoe, to take focus. Stacks of confidence in a minimal package.`,
    priceMinor: pkr(5200), pattern: 'PLAIN', tone: 'WARM', brightness: 'LIGHT',
    saturation: 'MUTED', formality: 'FORMAL', coverage: 'MODEST', cut: 'FITTED',
    silhouette: 'strappy', department: Department.WOMEN, categorySlug: 'shoes-women',
    subStyleSlug: 'stiletto-heels', sizes: ['36', '37', '38', '39', '40', '41'],
    imageLabel: 'Nude Barely-There Stiletto', imageBg: 'e0c9b5',
    attributesExtra: { heelHeightCm: 9, material: 'faux leather', closure: 'ankle-buckle', toe: 'open' },
  },

  // -- Kitten Heels -------------------------------------------------------
  {
    title: 'Ivory Pearl Kitten Heel',
    description: `The kitten heel is the most wearable heel there is  -  low enough to walk in all day, dressy enough for the office or a formal lunch. This ivory version in soft faux leather has a classic pointed toe and a delicate pearl detail on the vamp. Pairs beautifully with pastel lawn suits, ivory formals, or even white kurta with wide-leg pants. 4.5 cm heel.`,
    priceMinor: pkr(2900), pattern: 'PLAIN', tone: 'NEUTRAL', brightness: 'LIGHT',
    saturation: 'MUTED', formality: 'SEMI_FORMAL', coverage: 'FULL', cut: 'FITTED',
    silhouette: 'kitten-heel', department: Department.WOMEN, categorySlug: 'shoes-women',
    subStyleSlug: 'kitten-heels', sizes: ['36', '37', '38', '39', '40', '41'],
    imageLabel: 'Ivory Pearl Kitten Heel', imageBg: 'f0eae0',
    attributesExtra: { heelHeightCm: 4.5, material: 'faux leather', closure: 'slip-on', toe: 'pointed', detail: 'pearl vamp' },
  },
  {
    title: 'Black Patent Kitten Mule',
    description: `A sharp, polished everyday shoe. Black patent kitten mule with a slight flare at the heel base for extra stability. Backless slip-in design means you're in and out in seconds. The patent finish keeps it looking smart even when the rest of the look is casual  -  this is the shoe that makes a plain white kurta look intentional. 5 cm heel height.`,
    priceMinor: pkr(2500), pattern: 'PLAIN', tone: 'NEUTRAL', brightness: 'DARK',
    saturation: 'MUTED', formality: 'SEMI_FORMAL', coverage: 'FULL', cut: 'FITTED',
    silhouette: 'mule', department: Department.WOMEN, categorySlug: 'shoes-women',
    subStyleSlug: 'kitten-heels', sizes: ['36', '37', '38', '39', '40'],
    imageLabel: 'Black Patent Kitten Mule', imageBg: '1a1a2e',
    attributesExtra: { heelHeightCm: 5, material: 'patent faux leather', closure: 'slip-on', toe: 'round' },
  },

  // -- Wedge Heels --------------------------------------------------------
  {
    title: 'Tan Espadrille Wedge',
    description: `The espadrille wedge is practically made for Lahore summers  -  breathable, casual-dressy, endlessly comfortable. Tan jute-effect wedge base with canvas upper and lace-up ankle tie. 7 cm wedge gives height with zero wobble since the entire sole is in contact with the ground. Pairs brilliantly with summer printed lawn, linen trousers, or denim. Easy to walk in all day.`,
    priceMinor: pkr(3400), pattern: 'PLAIN', tone: 'WARM', brightness: 'MID',
    saturation: 'MUTED', formality: 'CASUAL', coverage: 'MODEST', cut: 'STRAIGHT',
    silhouette: 'wedge', department: Department.WOMEN, categorySlug: 'shoes-women',
    subStyleSlug: 'wedge-heels', sizes: ['36', '37', '38', '39', '40', '41'],
    imageLabel: 'Tan Espadrille Wedge', imageBg: 'c4a06a',
    attributesExtra: { heelHeightCm: 7, material: 'canvas + jute', closure: 'lace-ankle', toe: 'round' },
  },
  {
    title: 'White Platform Wedge Sandal',
    description: `Bold white wedge sandal with wide toe-straps and a thick cork-effect platform sole. The 9 cm platform wedge looks dramatic but actually keeps the foot at a gentler angle than a stiletto of the same height  -  you get the lift with far less strain. Stark white works against colourful printed outfits and also pairs with all-white looks for summer weddings. Adjustable ankle buckle.`,
    priceMinor: pkr(3800), pattern: 'PLAIN', tone: 'NEUTRAL', brightness: 'LIGHT',
    saturation: 'MUTED', formality: 'SEMI_FORMAL', coverage: 'MODEST', cut: 'STRAIGHT',
    silhouette: 'wedge', department: Department.WOMEN, categorySlug: 'shoes-women',
    subStyleSlug: 'wedge-heels', sizes: ['36', '37', '38', '39', '40'],
    imageLabel: 'White Platform Wedge Sandal', imageBg: 'e8e8e0',
    attributesExtra: { heelHeightCm: 9, material: 'faux leather + cork platform', closure: 'ankle-buckle', toe: 'open' },
  },

  // -- Bridal Khussa ------------------------------------------------------
  {
    title: 'Gold Zardozi Bridal Khussa',
    description: `Handcrafted in old Lahore's traditional khussa workshops, this bridal khussa is covered in hand-stitched zardozi embroidery on a gold base. The motifs are traditional Mughal floral patterns  -  the same craft that has adorned bridal footwear in the Punjab for over 200 years. Pointed toe, flexible leather sole, light enough to dance in. Made-to-order in your size. Allow 7-10 days.`,
    priceMinor: pkr(8500), pattern: 'EMBROIDERED', tone: 'WARM', brightness: 'MID',
    saturation: 'BRIGHT', formality: 'FORMAL', coverage: 'FULL', cut: 'FITTED',
    silhouette: 'khussa', department: Department.WOMEN, categorySlug: 'shoes-women',
    subStyleSlug: 'bridal-khussa', sizes: ['36', '37', '38', '39', '40', '41', '42'],
    imageLabel: 'Gold Zardozi Bridal Khussa', imageBg: 'b8860b',
    attributesExtra: { craft: 'zardozi embroidery', sole: 'leather', madeToOrder: true, deliveryDays: '7-10' },
  },
  {
    title: 'Red & Gold Phulkari Khussa',
    description: `Vibrant red base with dense phulkari-style embroidery in gold, orange, and ivory thread. This is the khussa that gets noticed  -  bold enough to complement a heavily-embroidered bridal lehenga or dulhan outfit, but can also hold its own against a simpler nikah dress. Handmade by a third-generation khussa artisan. Leather lining, no synthetic components. Size runs small  -  order one size up.`,
    priceMinor: pkr(7200), pattern: 'EMBROIDERED', tone: 'WARM', brightness: 'MID',
    saturation: 'BRIGHT', formality: 'FORMAL', coverage: 'FULL', cut: 'FITTED',
    silhouette: 'khussa', department: Department.WOMEN, categorySlug: 'shoes-women',
    subStyleSlug: 'bridal-khussa', sizes: ['36', '37', '38', '39', '40', '41'],
    imageLabel: 'Red & Gold Phulkari Khussa', imageBg: '8b0000',
    attributesExtra: { craft: 'phulkari embroidery', sole: 'leather', sizing: 'runs-small' },
  },
  {
    title: 'Silver Shisha Khussa',
    description: `An alternative to gold for brides who prefer cooler tones. White base with thousands of tiny shisha (mirror) pieces hand-stitched in geometric patterns, catching light with every step. The silver-and-white palette works with silver jewellery, silver embroidery, and off-white or champagne lehnga colours. Fully leather, lightweight, breathable. One of our most popular bridal styles.`,
    priceMinor: pkr(9000), pattern: 'EMBELLISHED', tone: 'COOL', brightness: 'LIGHT',
    saturation: 'BRIGHT', formality: 'FORMAL', coverage: 'FULL', cut: 'FITTED',
    silhouette: 'khussa', department: Department.WOMEN, categorySlug: 'shoes-women',
    subStyleSlug: 'bridal-khussa', sizes: ['35', '36', '37', '38', '39', '40', '41'],
    imageLabel: 'Silver Shisha Khussa', imageBg: 'c0c0c0',
    attributesExtra: { craft: 'shisha mirror work', sole: 'leather', metal: 'silver' },
  },
  {
    title: 'Ivory & Pearls Bridal Khussa',
    description: `For the bride who wants elegance over statement. Ivory matte fabric upper with clusters of freshwater pearls and tiny seed beads hand-applied in a delicate vine pattern. Quiet, refined, and beautiful against a white or ivory nikah outfit. Also popular as a walima shoe where the look has shifted from heavy to understated. Soft suede inner lining, leather sole.`,
    priceMinor: pkr(11000), pattern: 'EMBELLISHED', tone: 'NEUTRAL', brightness: 'LIGHT',
    saturation: 'MUTED', formality: 'FORMAL', coverage: 'FULL', cut: 'FITTED',
    silhouette: 'khussa', department: Department.WOMEN, categorySlug: 'shoes-women',
    subStyleSlug: 'bridal-khussa', sizes: ['35', '36', '37', '38', '39', '40', '41', '42'],
    imageLabel: 'Ivory & Pearls Bridal Khussa', imageBg: 'f5f0e8',
    attributesExtra: { craft: 'pearl & bead embellishment', sole: 'leather', lining: 'suede' },
  },

  // -- Casual Khussa ------------------------------------------------------
  {
    title: 'Mustard Embroidered Casual Khussa',
    description: `Everyday khussa done right. Mustard yellow with geometric cross-stitch embroidery in navy and rust  -  a colour combination straight from traditional Punjab craft. Casual enough for market runs and afternoon university classes, but interesting enough to make a plain white kurta-pajama outfit look considered. Genuine leather uppers, light rubber sole for outdoor wear. Size runs true.`,
    priceMinor: pkr(2200), pattern: 'EMBROIDERED', tone: 'WARM', brightness: 'MID',
    saturation: 'BRIGHT', formality: 'CASUAL', coverage: 'FULL', cut: 'FITTED',
    silhouette: 'khussa', department: Department.WOMEN, categorySlug: 'shoes-women',
    subStyleSlug: 'casual-khussa', sizes: ['36', '37', '38', '39', '40', '41'],
    imageLabel: 'Mustard Embroidered Casual Khussa', imageBg: 'd4a017',
    attributesExtra: { craft: 'cross-stitch', sole: 'rubber', sizing: 'true-to-size' },
  },
  {
    title: 'Forest Green Plain Khussa',
    description: `A clean, unembroidered khussa in deep forest green smooth leather. Sometimes the most stylish move is restraint  -  this pairs with printed lawn, denim, and linen separates without competing with the outfit. The deep green works especially well with earth tones, mustard, and burnt orange. Flexible leather sole that moulds to your foot over time. Gets better with wear.`,
    priceMinor: pkr(1800), pattern: 'PLAIN', tone: 'COOL', brightness: 'DARK',
    saturation: 'MUTED', formality: 'CASUAL', coverage: 'FULL', cut: 'FITTED',
    silhouette: 'khussa', department: Department.WOMEN, categorySlug: 'shoes-women',
    subStyleSlug: 'casual-khussa', sizes: ['35', '36', '37', '38', '39', '40', '41', '42'],
    imageLabel: 'Forest Green Plain Khussa', imageBg: '1a4731',
    attributesExtra: { sole: 'leather', finish: 'smooth' },
  },

  // -- Kolhapuri Flats ----------------------------------------------------
  {
    title: 'Tan T-Strap Kolhapuri',
    description: `The Kolhapuri sandal is one of South Asia's most functional designs  -  vegetable-tanned leather, T-strap construction, and a flat sole that distributes weight evenly. This tan version is an everyday workhorse: durable, breathable, and comfortable for hours. Pairs with cotton kurtas, linen trousers, or casual jeans. The leather darkens beautifully with use and conditioning. Handmade in the Kolhapuri tradition.`,
    priceMinor: pkr(2600), pattern: 'PLAIN', tone: 'WARM', brightness: 'MID',
    saturation: 'MUTED', formality: 'CASUAL', coverage: 'MODEST', cut: 'STRAIGHT',
    silhouette: 'kolhapuri', department: Department.WOMEN, categorySlug: 'shoes-women',
    subStyleSlug: 'kolhapuri-flats', sizes: ['35', '36', '37', '38', '39', '40', '41'],
    imageLabel: 'Tan T-Strap Kolhapuri', imageBg: 'b5763d',
    attributesExtra: { leather: 'vegetable-tanned', closure: 'T-strap buckle', sole: 'leather' },
  },
  {
    title: 'Black Lasercut Kolhapuri',
    description: `A modern take on the classic Kolhapuri. Black leather with a lasercut geometric pattern on the upper strap  -  where traditional versions rely on hand-punching, this uses precision laser cutting for a more consistent pattern. The design allows airflow while maintaining the closed-toe look. Flat sole, ankle buckle closure. Goes from casual to semi-formal without effort.`,
    priceMinor: pkr(3100), pattern: 'PRINTED', tone: 'NEUTRAL', brightness: 'DARK',
    saturation: 'MUTED', formality: 'SEMI_FORMAL', coverage: 'FULL', cut: 'STRAIGHT',
    silhouette: 'kolhapuri', department: Department.WOMEN, categorySlug: 'shoes-women',
    subStyleSlug: 'kolhapuri-flats', sizes: ['36', '37', '38', '39', '40', '41'],
    imageLabel: 'Black Lasercut Kolhapuri', imageBg: '1c1c1c',
    attributesExtra: { leather: 'genuine', closure: 'ankle-buckle', detail: 'lasercut geometric' },
  },

  // -- Strappy Sandals ----------------------------------------------------
  {
    title: 'Gold Multi-Strap Flat Sandal',
    description: `Five thin gold straps across the toe box and a wrap-around ankle strap  -  this flat sandal earns maximum impact for zero heel height. Gold metallic faux leather catches light the same way jewellery does. Flat comfort sole makes it a favourite for mehendi events and casual walima guests who want to look dressed up without sacrificing comfort. Adjustable ankle strap. Pairs with any coloured outfit.`,
    priceMinor: pkr(2400), pattern: 'PLAIN', tone: 'WARM', brightness: 'MID',
    saturation: 'BRIGHT', formality: 'SEMI_FORMAL', coverage: 'MODEST', cut: 'STRAIGHT',
    silhouette: 'sandal', department: Department.WOMEN, categorySlug: 'shoes-women',
    subStyleSlug: 'strappy-sandals', sizes: ['35', '36', '37', '38', '39', '40', '41'],
    imageLabel: 'Gold Multi-Strap Flat Sandal', imageBg: 'c9a84c',
    attributesExtra: { heelHeightCm: 0, material: 'metallic faux leather', closure: 'ankle-buckle', strapCount: 5 },
  },
  {
    title: 'Coral Toe-Ring Sandal with Ankle Wrap',
    description: `Bohemian in spirit, Lahori in execution. Coral/burnt orange toe-ring sandal with leather lace that wraps up the ankle. No buckle, no velcro  -  the lace ties in a bow at the back of the ankle. The coral shade works beautifully with white, ivory, mustard, and earthy tones. Flat leather sole, comfortable for all-day wear in summer. Hand-finished edges.`,
    priceMinor: pkr(1900), pattern: 'PLAIN', tone: 'WARM', brightness: 'MID',
    saturation: 'BRIGHT', formality: 'CASUAL', coverage: 'MODEST', cut: 'STRAIGHT',
    silhouette: 'sandal', department: Department.WOMEN, categorySlug: 'shoes-women',
    subStyleSlug: 'strappy-sandals', sizes: ['35', '36', '37', '38', '39', '40', '41', '42'],
    imageLabel: 'Coral Toe-Ring Ankle Wrap Sandal', imageBg: 'e07850',
    attributesExtra: { heelHeightCm: 0, closure: 'lace-tie', sole: 'leather', toe: 'toe-ring' },
  },
];

// ---------------------------------------------------------------------------
// Men's shoes  -  comprehensive
// ---------------------------------------------------------------------------

const MENS_SHOES: ProductSeed[] = [
  // -- Oxford / Formal Shoes ----------------------------------------------
  {
    title: 'Burgundy Captoe Oxford',
    description: `A pair of burgundy cap-toe Oxfords is one of the most useful things a man can own. This one in full-grain faux leather has clean cap-toe stitching, a leather-look sole, and a Goodyear-welt-style construction for longevity. Burgundy reads formal without being as severe as black  -  pairs with grey trousers, navy suits, and dark shalwar kameez. Lace-up, six eyelets, polished finish. Made for Men.`,
    priceMinor: pkr(7500), pattern: 'PLAIN', tone: 'WARM', brightness: 'DARK',
    saturation: 'MUTED', formality: 'FORMAL', coverage: 'FULL', cut: 'FITTED',
    silhouette: 'oxford', department: Department.MEN, categorySlug: 'shoes-men',
    subStyleSlug: 'oxford-formal', sizes: ['40', '41', '42', '43', '44', '45'],
    imageLabel: 'Burgundy Captoe Oxford', imageBg: '6b1a1a',
    attributesExtra: { material: 'full-grain faux leather', closure: 'lace-up', eyelets: 6, sole: 'leather-look' },
  },
  {
    title: 'Black Derby Dress Shoe',
    description: `The black Derby (open-lacing system, unlike the Oxford) is more forgiving on wider feet and easier to put on and take off  -  practical for daily office wear. This one has a clean, unadorned upper in smooth black faux leather, a cushioned insole, and a slightly square toe for a contemporary look. Pairs with suits, formal shalwar kameez, and dress trousers. A reliable workhorse shoe.`,
    priceMinor: pkr(5800), pattern: 'PLAIN', tone: 'NEUTRAL', brightness: 'DARK',
    saturation: 'MUTED', formality: 'FORMAL', coverage: 'FULL', cut: 'FITTED',
    silhouette: 'derby', department: Department.MEN, categorySlug: 'shoes-men',
    subStyleSlug: 'oxford-formal', sizes: ['40', '41', '42', '43', '44', '45', '46'],
    imageLabel: 'Black Derby Dress Shoe', imageBg: '0a0a0a',
    attributesExtra: { material: 'smooth faux leather', closure: 'open-lace derby', sole: 'rubber', toe: 'square' },
  },
  {
    title: 'Tan Brogue Oxford',
    description: `The brogue  -  with its decorative perforations and wing-tip toe  -  sits between casual and formal, which is exactly its appeal. Tan full-grain faux leather with punched broguing along the cap-toe and heel counter. This works with chinos, dress trousers, and even dark jeans for smart-casual looks. The tan colour is more versatile than it looks: pairs with navy, grey, olive, and earth tones. Dainite-style rubber sole for grip.`,
    priceMinor: pkr(6500), pattern: 'PLAIN', tone: 'WARM', brightness: 'MID',
    saturation: 'MUTED', formality: 'SEMI_FORMAL', coverage: 'FULL', cut: 'FITTED',
    silhouette: 'brogue-oxford', department: Department.MEN, categorySlug: 'shoes-men',
    subStyleSlug: 'oxford-formal', sizes: ['40', '41', '42', '43', '44', '45'],
    imageLabel: 'Tan Brogue Oxford', imageBg: 'a0724a',
    attributesExtra: { material: 'full-grain faux leather', closure: 'lace-up', detail: 'wingtip brogue', sole: 'rubber dainite' },
  },

  // -- Leather Loafers ----------------------------------------------------
  {
    title: 'Penny Loafer in Chocolate Brown',
    description: `The penny loafer is the king of no-effort smart dressing. Slip it on and you look like you tried, even when you didn't. This chocolate brown version has the classic moccasin-stitched toe, saddle strap with the signature penny slot, and a low stacked heel. The brown leather takes a polish well and deepens in colour with wear. No laces to fumble with in the morning. Good for office, casual Friday, and semi-formal dinners.`,
    priceMinor: pkr(5200), pattern: 'PLAIN', tone: 'WARM', brightness: 'DARK',
    saturation: 'MUTED', formality: 'SEMI_FORMAL', coverage: 'FULL', cut: 'FITTED',
    silhouette: 'loafer', department: Department.MEN, categorySlug: 'shoes-men',
    subStyleSlug: 'leather-loafers', sizes: ['40', '41', '42', '43', '44', '45'],
    imageLabel: 'Chocolate Penny Loafer', imageBg: '3d1c02',
    attributesExtra: { material: 'smooth faux leather', closure: 'slip-on', sole: 'leather-look', style: 'penny-slot' },
  },
  {
    title: 'Tassel Loafer  -  Navy Suede',
    description: `Tassel loafers carry a particular energy: confident, a little dandyish, unmistakably intentional. Navy blue faux suede with gold-tone tassel at the vamp. This reads smart-casual rather than strictly formal  -  perfect with chinos, lightweight trousers, or a linen shalwar kameez for summer events. Low heel, leather-look sole. Easy slip-in. The navy works especially well with grey, white, and cream outfits.`,
    priceMinor: pkr(6000), pattern: 'PLAIN', tone: 'COOL', brightness: 'DARK',
    saturation: 'MUTED', formality: 'SEMI_FORMAL', coverage: 'FULL', cut: 'FITTED',
    silhouette: 'loafer', department: Department.MEN, categorySlug: 'shoes-men',
    subStyleSlug: 'leather-loafers', sizes: ['40', '41', '42', '43', '44', '45'],
    imageLabel: 'Navy Suede Tassel Loafer', imageBg: '1a2a5e',
    attributesExtra: { material: 'faux suede', closure: 'slip-on', detail: 'gold tassel', sole: 'leather-look' },
  },

  // -- Peshawari Chappal --------------------------------------------------
  {
    title: 'Classic Peshawari Chappal  -  Tan',
    description: `The Peshawari chappal is an icon of the subcontinent  -  worn for centuries from the North-West Frontier to the plains of Punjab, and just as at home today. This tan version is handcrafted from thick vegetable-tanned cowhide with the characteristic woven leather upper and broad toe strap. Sturdy enough for outdoor wear, refined enough for a shalwar kameez. The sole is triple-layered raw hide  -  it will outlast most other footwear you own.`,
    priceMinor: pkr(3800), pattern: 'PLAIN', tone: 'WARM', brightness: 'MID',
    saturation: 'MUTED', formality: 'SEMI_FORMAL', coverage: 'MODEST', cut: 'STRAIGHT',
    silhouette: 'chappal', department: Department.MEN, categorySlug: 'shoes-men',
    subStyleSlug: 'peshawari-chappal', sizes: ['40', '41', '42', '43', '44', '45', '46'],
    imageLabel: 'Classic Tan Peshawari Chappal', imageBg: 'c4874a',
    attributesExtra: { leather: 'vegetable-tanned cowhide', sole: 'triple-layer rawhide', handmade: true },
  },
  {
    title: 'Dark Brown Peshawari Chappal  -  Premium',
    description: `The same iconic Peshawari construction but in a darker, richer brown with a finer braid pattern on the upper. This is for the man who wears this style daily and wants a step up in quality  -  the leather is thicker, the braid is tighter and more uniform, and the finishing at the edges is hand-burnished. Deep brown pairs with white, cream, and khaki shalwar kameez. Also excellent with formal sherwanis for a traditional look.`,
    priceMinor: pkr(5500), pattern: 'PLAIN', tone: 'WARM', brightness: 'DARK',
    saturation: 'MUTED', formality: 'SEMI_FORMAL', coverage: 'MODEST', cut: 'STRAIGHT',
    silhouette: 'chappal', department: Department.MEN, categorySlug: 'shoes-men',
    subStyleSlug: 'peshawari-chappal', sizes: ['40', '41', '42', '43', '44', '45'],
    imageLabel: 'Dark Brown Premium Peshawari', imageBg: '3b1c0a',
    attributesExtra: { leather: 'premium vegetable-tanned', sole: 'triple-layer rawhide', finish: 'hand-burnished', handmade: true },
  },
  {
    title: 'Black Peshawari Chappal',
    description: `Black Peshawari for those who want the comfort and heritage of the design with a more urban, versatile colour. Black works with everything  -  black trousers, dark jeans, black shalwar kameez, formal sherwanis. Same handmade woven upper construction and thick leather sole. The black dye is natural-base and will develop a patina with wear rather than cracking or flaking.`,
    priceMinor: pkr(4200), pattern: 'PLAIN', tone: 'NEUTRAL', brightness: 'DARK',
    saturation: 'MUTED', formality: 'SEMI_FORMAL', coverage: 'MODEST', cut: 'STRAIGHT',
    silhouette: 'chappal', department: Department.MEN, categorySlug: 'shoes-men',
    subStyleSlug: 'peshawari-chappal', sizes: ['40', '41', '42', '43', '44', '45', '46'],
    imageLabel: 'Black Peshawari Chappal', imageBg: '111111',
    attributesExtra: { leather: 'dyed cowhide', sole: 'triple-layer rawhide', dye: 'natural-base' },
  },

  // -- Norozi Chappal -----------------------------------------------------
  {
    title: 'Tan Norozi Chappal  -  Traditional',
    description: `The Norozi chappal is the Peshawari's lighter cousin  -  thinner sole, more open construction, and slightly more refined profile. This tan version is ideal for indoor use, formal occasions like nikah ceremonies, and as a dressing slipper in warmer weather. The toe loop and side straps keep it secure while the open heel keeps feet cool. Vegetable-tanned leather, natural finish.`,
    priceMinor: pkr(3200), pattern: 'PLAIN', tone: 'WARM', brightness: 'LIGHT',
    saturation: 'MUTED', formality: 'SEMI_FORMAL', coverage: 'MODEST', cut: 'STRAIGHT',
    silhouette: 'chappal', department: Department.MEN, categorySlug: 'shoes-men',
    subStyleSlug: 'norozi-chappal', sizes: ['40', '41', '42', '43', '44', '45'],
    imageLabel: 'Tan Norozi Chappal', imageBg: 'd4a46a',
    attributesExtra: { leather: 'vegetable-tanned', sole: 'single-layer leather', style: 'norozi', handmade: true },
  },

  // -- Casual Sneakers ----------------------------------------------------
  {
    title: 'White Canvas Low-Top Sneaker',
    description: `The white canvas low-top is the most democratic shoe in existence  -  it looks right with jeans, shorts, linen trousers, and even a casual shalwar kameez. This version has a clean canvas upper with minimal branding, vulcanised rubber sole, and a lightly cushioned footbed. Classic five-eyelet lace-up. The canvas washes well. A fundamental piece for any wardrobe that gets replaced every season rather than repaired.`,
    priceMinor: pkr(2400), pattern: 'PLAIN', tone: 'NEUTRAL', brightness: 'LIGHT',
    saturation: 'MUTED', formality: 'CASUAL', coverage: 'FULL', cut: 'STRAIGHT',
    silhouette: 'sneaker', department: Department.MEN, categorySlug: 'shoes-men',
    subStyleSlug: 'casual-sneakers', sizes: ['40', '41', '42', '43', '44', '45', '46'],
    imageLabel: 'White Canvas Low-Top Sneaker', imageBg: 'f0f0f0',
    attributesExtra: { material: 'canvas', sole: 'vulcanised rubber', closure: 'lace-up', height: 'low-top' },
  },
  {
    title: 'Navy Mesh Runner Sneaker',
    description: `Lightweight breathable mesh upper in navy blue on a chunky white EVA sole. This running-inspired silhouette has crossed over into everyday wear because the thick sole adds a couple centimetres of casual height and the mesh keeps feet cool in Lahore summers. Padded collar, removable insole, slip-resistant rubber outsole. Pairs with casual trousers and denim. Not for sports use  -  the sole isn't designed for lateral movement.`,
    priceMinor: pkr(3600), pattern: 'PLAIN', tone: 'COOL', brightness: 'DARK',
    saturation: 'MUTED', formality: 'CASUAL', coverage: 'FULL', cut: 'STRAIGHT',
    silhouette: 'sneaker', department: Department.MEN, categorySlug: 'shoes-men',
    subStyleSlug: 'casual-sneakers', sizes: ['40', '41', '42', '43', '44', '45'],
    imageLabel: 'Navy Mesh Runner Sneaker', imageBg: '1a3060',
    attributesExtra: { material: 'mesh', sole: 'EVA + rubber', closure: 'lace-up', height: 'low-top', removableInsole: true },
  },
  {
    title: 'Olive Suede Retro Sneaker',
    description: `Retro basketball silhouette in olive green faux suede with cream midsole and gum rubber outsole. The muted olive colour is one of those rare shades that works with almost every other colour in the palette  -  earthy tones, navy, grey, white, and denim all pair well. Higher ankle than a typical low-top, which gives some ankle support for urban wear. Padded tongue and collar for comfort.`,
    priceMinor: pkr(4200), pattern: 'PLAIN', tone: 'WARM', brightness: 'DARK',
    saturation: 'MUTED', formality: 'CASUAL', coverage: 'FULL', cut: 'STRAIGHT',
    silhouette: 'sneaker', department: Department.MEN, categorySlug: 'shoes-men',
    subStyleSlug: 'casual-sneakers', sizes: ['40', '41', '42', '43', '44', '45'],
    imageLabel: 'Olive Suede Retro Sneaker', imageBg: '3d4a1a',
    attributesExtra: { material: 'faux suede', sole: 'gum rubber', closure: 'lace-up', height: 'mid-top', era: 'retro-basketball' },
  },

  // -- Leather Boots ------------------------------------------------------
  {
    title: 'Chukka Boot in Tan Leather',
    description: `The chukka  -  two or three eyelets, ankle height, clean silhouette  -  is the boot equivalent of a penny loafer in versatility. This tan faux leather version has a crepe-look rubber sole that works on city streets without looking too outdoorsy. The simple silhouette means it dresses up (with trousers) or down (with jeans) equally well. For colder months in Lahore when an open shoe feels wrong but a full boot feels heavy. Fits true to size.`,
    priceMinor: pkr(7000), pattern: 'PLAIN', tone: 'WARM', brightness: 'MID',
    saturation: 'MUTED', formality: 'SEMI_FORMAL', coverage: 'FULL', cut: 'FITTED',
    silhouette: 'chukka-boot', department: Department.MEN, categorySlug: 'shoes-men',
    subStyleSlug: 'leather-boots', sizes: ['40', '41', '42', '43', '44', '45'],
    imageLabel: 'Tan Chukka Boot', imageBg: 'b5844a',
    attributesExtra: { material: 'faux leather', sole: 'crepe-rubber', closure: 'lace-up', eyelets: 3, height: 'ankle' },
  },
  {
    title: 'Black Side-Zip Chelsea Boot',
    description: `Chelsea boots  -  elastic side panels, no laces, clean silhouette  -  are the most efficient boot design ever made. This black version in smooth faux leather has the classic twin elastic gussets and a pull-loop at the back. The slight stacked heel (4 cm) gives a subtle lift. Pairs with slim-fit trousers, chinos, or straight-leg denim. The elastic gussets mean you can slip them on and off in seconds  -  ideal for removing shoes at doors in Pakistan.`,
    priceMinor: pkr(8500), pattern: 'PLAIN', tone: 'NEUTRAL', brightness: 'DARK',
    saturation: 'MUTED', formality: 'SEMI_FORMAL', coverage: 'FULL', cut: 'FITTED',
    silhouette: 'chelsea-boot', department: Department.MEN, categorySlug: 'shoes-men',
    subStyleSlug: 'leather-boots', sizes: ['40', '41', '42', '43', '44', '45', '46'],
    imageLabel: 'Black Chelsea Boot', imageBg: '050505',
    attributesExtra: { material: 'smooth faux leather', closure: 'elastic-gusset', heelHeightCm: 4, height: 'ankle' },
  },
];

// ---------------------------------------------------------------------------
// Women's clothing  -  enough for a realistic pilot
// ---------------------------------------------------------------------------

const WOMENS_CLOTHING: ProductSeed[] = [
  {
    title: 'Classic Black Open-Front Abaya',
    description: `The open-front abaya is the most practical style for daily use: throw it over any outfit as you leave the house, no buttons or snaps to deal with, falls cleanly over both slim and fuller cuts underneath. This one is in matte nida fabric  -  the most popular abaya material in Lahore right now because it drapes well, doesn't cling, and doesn't wrinkle on long drives. Straight cut, full coverage, functional inner buttons to close when needed.`,
    priceMinor: pkr(4800), pattern: 'PLAIN', tone: 'NEUTRAL', brightness: 'DARK',
    saturation: 'MUTED', formality: 'CASUAL', coverage: 'FULL', cut: 'STRAIGHT',
    silhouette: 'abaya', department: Department.WOMEN, categorySlug: 'abaya',
    subStyleSlug: 'open-front-abaya', sizes: ['S', 'M', 'L', 'XL', 'XXL', 'Free Size'],
    imageLabel: 'Classic Black Open-Front Abaya', imageBg: '0d0d0d',
    attributesExtra: { fabric: 'nida', innerButtons: true, sleeveCut: 'full-length' },
  },
  {
    title: 'Ivory Embroidered Neckline Abaya',
    description: `An abaya that works for formal occasions without being heavy or fussy. Ivory nida fabric with laser-cut embroidered trim along the neckline and sleeve cuffs in a geometric Moroccan-inspired pattern. The ivory makes it appropriate for evening events, nikah gatherings, and formal dinners where black feels too stark. Flared slightly at the hem for ease of movement. Lined throughout.`,
    priceMinor: pkr(8500), pattern: 'EMBROIDERED', tone: 'NEUTRAL', brightness: 'LIGHT',
    saturation: 'MUTED', formality: 'FORMAL', coverage: 'FULL', cut: 'FLOWY',
    silhouette: 'abaya', department: Department.WOMEN, categorySlug: 'abaya',
    subStyleSlug: 'formal-abaya', sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    imageLabel: 'Ivory Embroidered Neckline Abaya', imageBg: 'efe8dc',
    attributesExtra: { fabric: 'nida', lined: true, embroidery: 'laser-cut Moroccan neckline + cuffs' },
  },
  {
    title: 'Dusty Mauve Dubai Abaya with Belt',
    description: `The belted abaya is the style that has taken over Gulf fashion and arrived in Lahore's salons and malls. This dusty mauve version in premium nida has a matching fabric sash belt that creates a waist  -  a significant departure from the traditional straight silhouette. The colour is warm and flattering on most skin tones. Loose sleeves, slight flare at hem, concealed snap closure.`,
    priceMinor: pkr(9500), pattern: 'PLAIN', tone: 'WARM', brightness: 'MID',
    saturation: 'MUTED', formality: 'SEMI_FORMAL', coverage: 'FULL', cut: 'FITTED',
    silhouette: 'abaya', department: Department.WOMEN, categorySlug: 'abaya',
    subStyleSlug: 'dubai-abaya', sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    imageLabel: 'Dusty Mauve Dubai Abaya with Belt', imageBg: 'b090a0',
    attributesExtra: { fabric: 'premium nida', belt: 'matching fabric sash', closure: 'concealed snap' },
  },
  {
    title: 'Printed Lawn 3-Piece  -  Gulab Bagh',
    description: `Summer essentials. This printed lawn 3-piece (kameez, dupatta, plain trousers) has a scattered rose garden print on a cream base  -  pink, coral, and sage green florals in the style that's defined Lahori spring fashion for 30 years. The lawn is unstitched so it can be tailored to your exact measurements, or worn as-is after basic hemming. Dupatta has a printed border. Trousers are plain cream cotton cambric.`,
    priceMinor: pkr(3200), pattern: 'PRINTED', tone: 'WARM', brightness: 'LIGHT',
    saturation: 'BRIGHT', formality: 'CASUAL', coverage: 'FULL', cut: 'STRAIGHT',
    silhouette: 'lawn-3piece', department: Department.WOMEN, categorySlug: 'lawn',
    subStyleSlug: 'lawn-3piece', sizes: ['Unstitched  -  One Size'],
    imageLabel: 'Gulab Bagh Printed Lawn 3-Piece', imageBg: 'f5d5c5',
    attributesExtra: { pieces: 3, fabric: '100% lawn + cotton cambric', stitched: false, print: 'floral rose garden on cream' },
  },
  {
    title: 'Embroidered Lawn Kameez  -  Sapphire Blue',
    description: `Ready-to-wear, no stitching needed. Sapphire blue lawn kameez with heavy hand-embroidered neckline and sleeve border in white and silver thread. Straight cut with a modest length (below hip). Comes with a matching lawn dupatta and plain white cotton trousers. The embroidery is the kind that used to take a specialist two weeks by hand  -  now done by artisan workshops in Lahore in 3-4 days without sacrificing quality.`,
    priceMinor: pkr(5500), pattern: 'EMBROIDERED', tone: 'COOL', brightness: 'MID',
    saturation: 'BRIGHT', formality: 'SEMI_FORMAL', coverage: 'FULL', cut: 'STRAIGHT',
    silhouette: 'kameez', department: Department.WOMEN, categorySlug: 'lawn',
    subStyleSlug: 'embroidered-lawn', sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    imageLabel: 'Sapphire Blue Embroidered Lawn', imageBg: '1040a0',
    attributesExtra: { pieces: 3, stitched: true, embroidery: 'hand-finished neckline + sleeve border' },
  },
];

// ---------------------------------------------------------------------------
// Men's clothing  -  enough for a realistic pilot
// ---------------------------------------------------------------------------

const MENS_CLOTHING: ProductSeed[] = [
  {
    title: 'Crisp White Formal Dress Shirt',
    description: `The white dress shirt is not optional in a man's wardrobe  -  it is the baseline. This one in 100% poplin cotton has a point collar, double-button cuffs, and a slim fit cut for Lahore's heat: lightweight enough to stay cool in summer, structured enough to not look sloppy in an office or at a formal dinner. Wear it under a suit jacket or tucked into dress trousers with a leather belt. Iron and go.`,
    priceMinor: pkr(2800), pattern: 'PLAIN', tone: 'NEUTRAL', brightness: 'LIGHT',
    saturation: 'MUTED', formality: 'FORMAL', coverage: 'FULL', cut: 'FITTED',
    silhouette: 'dress-shirt', department: Department.MEN, categorySlug: 'shirt',
    subStyleSlug: 'formal-shirt', sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    imageLabel: 'White Formal Poplin Shirt', imageBg: 'f5f5f5',
    attributesExtra: { fabric: '100% poplin cotton', collar: 'point', cuff: 'double-button', fit: 'slim' },
  },
  {
    title: 'Navy Linen Casual Shirt  -  Relaxed Fit',
    description: `Linen is the fabric Lahore summers were made for. This navy linen shirt in a relaxed, slightly boxy fit is designed to be worn untucked over trousers or shalwar  -  the length and side slits are cut for exactly this. Short sleeves, spread collar, single chest pocket. The washed navy has enough texture to look intentional rather than wrinkled. Gets softer and better with every wash.`,
    priceMinor: pkr(3200), pattern: 'PLAIN', tone: 'COOL', brightness: 'DARK',
    saturation: 'MUTED', formality: 'CASUAL', coverage: 'FULL', cut: 'STRAIGHT',
    silhouette: 'casual-shirt', department: Department.MEN, categorySlug: 'shirt',
    subStyleSlug: 'linen-shirt', sizes: ['S', 'M', 'L', 'XL', 'XXL', 'XXXL'],
    imageLabel: 'Navy Linen Casual Shirt', imageBg: '1a2a5e',
    attributesExtra: { fabric: '100% linen', sleeve: 'short', collar: 'spread', fit: 'relaxed', untucked: true },
  },
  {
    title: 'Off-White Wash & Wear Shalwar Kameez',
    description: `The Lahori man's daily uniform, done well. Off-white wash & wear fabric  -  the synthetic blend that holds its shape and resists wrinkles, which is why it dominates office and formal wear in the city. Straight cut kameez with subtle thread texture in the fabric, wide shalwar, matching kameez. Easy to iron, looks crisp all day. The off-white works for office use, casual gatherings, and semi-formal occasions equally. Ready to wear as purchased.`,
    priceMinor: pkr(3800), pattern: 'PLAIN', tone: 'NEUTRAL', brightness: 'LIGHT',
    saturation: 'MUTED', formality: 'SEMI_FORMAL', coverage: 'FULL', cut: 'STRAIGHT',
    silhouette: 'shalwar-kameez', department: Department.MEN, categorySlug: 'shalwar-kameez',
    subStyleSlug: 'wash-and-wear', sizes: ['S', 'M', 'L', 'XL', 'XXL', 'XXXL'],
    imageLabel: 'Off-White Wash & Wear Shalwar Kameez', imageBg: 'e8e4da',
    attributesExtra: { fabric: 'wash & wear (poly-viscose)', pieces: 2, stitched: true },
  },
  {
    title: 'Groom Sherwani  -  Deep Maroon with Gold Embroidery',
    description: `For the baraat, this is the sherwani. Deep maroon raw silk with dense zardozi goldwork across the chest, collar, and cuffs  -  the kind of embroidery that takes three artisans and two weeks to complete. The maroon-and-gold combination has dressed grooms across the Punjab for a century for a reason: it is regal, warm-toned, and photographs beautifully under any light. Comes with matching churidar and dupatta. Dry clean only.`,
    priceMinor: pkr(85000), pattern: 'EMBROIDERED', tone: 'WARM', brightness: 'DARK',
    saturation: 'BRIGHT', formality: 'FORMAL', coverage: 'FULL', cut: 'FITTED',
    silhouette: 'sherwani', department: Department.MEN, categorySlug: 'sherwani',
    subStyleSlug: 'groom-sherwani', sizes: ['S', 'M', 'L', 'XL', 'XXL', 'Made-to-Measure'],
    imageLabel: 'Maroon & Gold Groom Sherwani', imageBg: '4a0010',
    attributesExtra: { fabric: 'raw silk', embroidery: 'zardozi goldwork', pieces: 3, care: 'dry-clean-only', delivery: 'made-to-order 3-4 weeks' },
  },
  {
    title: 'Navy Embroidered Prince Coat',
    description: `The prince coat  -  knee-length, Nehru collar, fitted silhouette  -  is the semi-formal choice for men who want something between a full sherwani and a plain shalwar kameez. Navy cotton silk blend with tonal navy thread embroidery on the collar and chest in a subtle vine pattern. Buttons down the front. Pairs with cream or white churidar for functions, or dark straight trousers for a less traditional look. Very popular for walima events.`,
    priceMinor: pkr(18000), pattern: 'EMBROIDERED', tone: 'COOL', brightness: 'DARK',
    saturation: 'MUTED', formality: 'FORMAL', coverage: 'FULL', cut: 'FITTED',
    silhouette: 'prince-coat', department: Department.MEN, categorySlug: 'sherwani',
    subStyleSlug: 'prince-coat', sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    imageLabel: 'Navy Prince Coat with Tonal Embroidery', imageBg: '0d1a3a',
    attributesExtra: { fabric: 'cotton-silk blend', embroidery: 'tonal thread vine pattern', collar: 'Nehru', buttonFront: true },
  },
];

// ---------------------------------------------------------------------------
// Main seed function
// ---------------------------------------------------------------------------

async function main() {
  console.log('-  Trylo pilot seed  -  starting...');

  // Clear in dependency order so FK constraints don't block
  await prisma.feedbackEvent.deleteMany();
  await prisma.searchQuery.deleteMany();
  await prisma.interactionEvent.deleteMany();
  await prisma.swipeEvent.deleteMany();
  await prisma.session.deleteMany();
  await prisma.disputeEvidence.deleteMany();
  await prisma.disputeStatusEvent.deleteMany();
  await prisma.dispute.deleteMany();
  await prisma.paymentStatusEvent.deleteMany();
  await prisma.review.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.productImage.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.subStyle.deleteMany();
  await prisma.rootCategory.deleteMany();
  await prisma.otpVerification.deleteMany();
  await prisma.seller.deleteMany();
  await prisma.user.deleteMany();
  console.log('   - Cleared existing data');

  // -- Sellers (Gate 1 verified) -----------------------------------------
  const sellerUsers = await Promise.all([
    prisma.user.create({
      data: {
        email: 'lahori.jutay@trylo.pk',
        phone: '+923001111001',
        passwordHash: await bcrypt.hash('seed-password', 10),
        fullName: 'Muhammad Arif',
        seller: {
          create: {
            businessName: 'Lahori Jutay Wala',
            location: 'Lahore, Punjab',
            addressLine: 'Shop 12, Anarkali Bazaar, Lahore',
            verificationStatus: VerificationStatus.VERIFIED,
            phoneVerified: true,
            cnicNumber: '3520212345671',
            verifiedAt: new Date(),
            ratingAverage: 4.8,
            ratingCount: 143,
            salesCount: 312,
          },
        },
      },
      include: { seller: true },
    }),
    prisma.user.create({
      data: {
        email: 'style.avenue@trylo.pk',
        phone: '+923001111002',
        passwordHash: await bcrypt.hash('seed-password', 10),
        fullName: 'Fatima Malik',
        seller: {
          create: {
            businessName: 'Style Avenue Lahore',
            location: 'Lahore, Punjab',
            addressLine: 'G-18, MM Alam Road, Gulberg III, Lahore',
            verificationStatus: VerificationStatus.VERIFIED,
            phoneVerified: true,
            cnicNumber: '3520298765432',
            verifiedAt: new Date(),
            ratingAverage: 4.6,
            ratingCount: 89,
            salesCount: 201,
          },
        },
      },
      include: { seller: true },
    }),
    prisma.user.create({
      data: {
        email: 'bridal.corner@trylo.pk',
        phone: '+923001111003',
        passwordHash: await bcrypt.hash('seed-password', 10),
        fullName: 'Ayesha Raza',
        seller: {
          create: {
            businessName: 'Bridal Corner by Ayesha',
            location: 'Lahore, Punjab',
            addressLine: 'Plot 5, Cavalry Ground, Lahore',
            verificationStatus: VerificationStatus.VERIFIED,
            phoneVerified: true,
            cnicNumber: '3520211122334',
            verifiedAt: new Date(),
            ratingAverage: 4.9,
            ratingCount: 67,
            salesCount: 94,
          },
        },
      },
      include: { seller: true },
    }),
  ]);

  const sellers = sellerUsers.map((u) => u.seller!);
  console.log(`   - Created ${sellers.length} verified sellers`);

  // Also create one admin user for the internal dashboard
  await prisma.user.create({
    data: {
      email: 'admin@trylo.pk',
      phone: '+923009999999',
      passwordHash: await bcrypt.hash('trylo-admin-2024', 10),
      fullName: 'Trylo Admin',
      isAdmin: true,
    },
  });
  console.log('   - Created admin user (admin@trylo.pk / trylo-admin-2024)');

  // -- Taxonomy ----------------------------------------------------------
  const categoryMap: Record<string, { id: string; subStyles: Record<string, string> }> = {};

  for (const cat of TAXONOMY) {
    const created = await prisma.rootCategory.create({
      data: {
        name: cat.name,
        slug: cat.slug,
        department: cat.department,
        subStyles: {
          create: cat.subStyles.map((ss, i) => ({ name: ss.name, slug: ss.slug, displayOrder: i })),
        },
      },
      include: { subStyles: true },
    });
    categoryMap[cat.slug] = {
      id: created.id,
      subStyles: Object.fromEntries(created.subStyles.map((ss) => [ss.slug, ss.id])),
    };
  }
  console.log(`   - Seeded ${TAXONOMY.length} categories with sub-styles`);

  // -- Products ----------------------------------------------------------
  const allProducts: ProductSeed[] = [
    ...WOMENS_SHOES,
    ...MENS_SHOES,
    ...WOMENS_CLOTHING,
    ...MENS_CLOTHING,
  ];

  let productCount = 0;
  for (const p of allProducts) {
    const catData = categoryMap[p.categorySlug];
    if (!catData) {
      console.warn(`   - Unknown category slug: ${p.categorySlug}  -  skipping "${p.title}"`);
      continue;
    }
    const subStyleId = catData.subStyles[p.subStyleSlug];
    if (!subStyleId) {
      console.warn(`   - Unknown sub-style slug: ${p.subStyleSlug}  -  skipping "${p.title}"`);
      continue;
    }

    // Distribute products across sellers
    const seller = sellers[productCount % sellers.length];

    await prisma.product.create({
      data: {
        sellerId: seller.id,
        department: p.department,
        rootCategoryId: catData.id,
        subStyleId,
        title: p.title,
        description: p.description,
        priceMinor: p.priceMinor,
        pattern: p.pattern,
        tone: p.tone,
        brightness: p.brightness,
        saturation: p.saturation,
        formality: p.formality,
        coverage: p.coverage,
        cut: p.cut,
        silhouette: p.silhouette,
        attributesExtra: p.attributesExtra ?? {},
        status: ProductStatus.LIVE,
        images: {
          create: {
            // Honest placeholder  -  clearly not a real product photo.
            // Replace with real seller-supplied image URLs when they onboard.
            url: placeholder(p.imageLabel, p.imageBg),
            kind: 'FRONT',
            sortOrder: 0,
          },
        },
        variants: {
          create: p.sizes.map((size) => ({
            size,
            stockQty: Math.floor(Math.random() * 8) + 2, // 2-9 units
          })),
        },
      },
    });
    productCount++;
  }
  console.log(`   - Seeded ${productCount} products`);

  // -- Summary -----------------------------------------------------------
  const counts = await Promise.all([
    prisma.seller.count(),
    prisma.product.count(),
    prisma.rootCategory.count(),
    prisma.subStyle.count(),
  ]);

  console.log('\n-  Seed complete.');
  console.log(`   Sellers:       ${counts[0]}`);
  console.log(`   Products:      ${counts[1]}`);
  console.log(`   Categories:    ${counts[2]}`);
  console.log(`   Sub-styles:    ${counts[3]}`);
  console.log('\n   Admin login:   admin@trylo.pk  /  trylo-admin-2024');
  console.log('   Seller login:  lahori.jutay@trylo.pk  /  seed-password');
  console.log('\n   -  ALL product images are placeholders (coloured rectangles).');
  console.log('      Replace with real seller photos before any public-facing use.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
