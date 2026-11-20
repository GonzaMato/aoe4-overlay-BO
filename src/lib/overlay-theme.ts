import { civilizationKey } from './civilizations';

export interface CivilizationPalette { primary: string; secondary: string; accent: string }
// Inspired by the bundled in-game flags. Accents are lighter for readable text
// on the dark overlay; flag colors remain in the decorative stripe and tint.
const palettes: Record<string, CivilizationPalette> = Object.fromEntries([
 ['english', '#C93F32', '#E8EBEF', '#FF9690'],
 ['french', '#187CC1', '#F2D35F', '#F2D35F'],
 ['holy_roman_empire', '#D9B830', '#252528', '#F2D35F'],
 ['rus', '#B9352C', '#CBD4DB', '#FF9690'],
 ['mongols', '#148AB4', '#F4D354', '#F4D354'],
 ['chinese', '#B63720', '#F3CE60', '#F3CE60'],
 ['delhi_sultanate', '#16845C', '#142822', '#73D6AA'],
 ['abbasid_dynasty', '#24262A', '#53565C', '#C8CDD5'],
 ['ottomans', '#287644', '#E5EBDD', '#92D8A5'],
 ['malians', '#AF2454', '#E5C635', '#F2D35F'],
 ['byzantines', '#5A2A91', '#E3D57E', '#C5A0F0'],
 ['japanese', '#E2E5E6', '#D4AC23', '#F1D06D'],
 ['order_of_the_dragon', '#D0B322', '#252528', '#F2D35F'],
 ['zhu_xis_legacy', '#187F87', '#E5EBDD', '#83D8DC'],
 ['jeanne_darc', '#E4E7E9', '#C8A02E', '#F1D06D'],
 ['ayyubids', '#D0B72B', '#7C2543', '#F2D35F'],
 ['knights_templar', '#D0463F', '#E4E7E9', '#FF9690'],
 ['house_of_lancaster', '#315695', '#D6586C', '#A1BDF6'],
 ['golden_horde', '#E2E5E6', '#B63A36', '#FF9690'],
 ['macedonian_dynasty', '#A72E39', '#D8BA35', '#F2D35F'],
 ['sengoku_daimyo', '#B73C40', '#D5C37E', '#E8D69A'],
 ['tughlaq_dynasty', '#8D9094', '#202224', '#D5D9DF'],
 ['jin_dynasty', '#2E8C3A', '#E6BB2B', '#F2D35F'],
 ['vikings', '#252528', '#BE3D39', '#FF9690'],
 ['scots', '#375B9D', '#E5E9EF', '#A1BDF6']
].map(([key, primary, secondary, accent]) => [key, { primary, secondary, accent }]));

export function overlayTheme(civ: string, enabled: boolean, customAccent: string) {
 const key = civilizationKey(civ);
 const palette = enabled && key ? palettes[key] : null;
 return { accent: palette?.accent ?? customAccent, palette: palette ?? null };
}

export function overlayThemeStyle(civ: string, enabled: boolean, customAccent: string): string {
 const { accent, palette } = overlayTheme(civ, enabled, customAccent);
 const base = `--accent: ${accent}; --preview-accent: ${accent};`;
 if (!palette) return base;
 const surfaces=themeSurfaces(palette);
 return `${base} --bg: ${surfaces.cell}; --card: ${surfaces.card}; --text: #F4F1ED; --soft: #D9DCE3; --dim: #B7C0CD; --line: color-mix(in srgb, ${palette.accent} 22%, ${surfaces.background}); --line-strong: color-mix(in srgb, ${palette.accent} 42%, ${surfaces.card}); --civ-surface: linear-gradient(90deg, ${palette.primary} 50%, ${palette.secondary} 50%) top / 100% 5px no-repeat, linear-gradient(135deg, ${surfaces.background}, ${surfaces.cell}); --civ-border: color-mix(in srgb, ${palette.accent} 65%, ${surfaces.background});`;
}

export function colorLuminance(hex:string):number {
 const rgb=hex.slice(1).match(/../g)!.map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
 return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;
}
function darkTint(hex:string,amount:number):string {
 const channels=hex.slice(1).match(/../g)!.map(v=>parseInt(v,16));
 const mix=(ratio:number)=>'#'+channels.map((c,i)=>Math.round(c*ratio+[10,12,16][i]*(1-ratio)).toString(16).padStart(2,'0')).join('');
 let result=mix(amount);
 while(colorLuminance(result)>.045){amount*=.9;result=mix(amount);}
 return result;
}
export function themeSurfaces(palette:CivilizationPalette) {
 return {background:darkTint(palette.primary,.48),card:darkTint(palette.primary,.65),cell:darkTint(palette.primary,.28)};
}
