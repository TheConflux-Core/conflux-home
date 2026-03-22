// Agent Profile Descriptions — onboarding and marketplace data
// Accent colors are synced with AGENT_COLORS in src/types.ts

import { AGENT_COLORS } from '../types';

export interface AgentProfile {
  id: string;
  name: string;
  emoji: string;
  role: string;
  tagline: string;       // one-line hook
  description: string;   // 2-3 sentences for onboarding display
  personality: string;   // how they talk/act
  skills: string[];      // what they're good at
  bestFor: string[];     // use cases
  avatarPath: string;    // /avatars/{id}.png
  color: string;         // accent color (synced with AGENT_COLORS)
}

export const AGENT_PROFILES: AgentProfile[] = [
  {
    id: 'zigbot',
    name: 'ZigBot',
    emoji: '🤖',
    role: 'Strategic Partner',
    tagline: 'Your co-founder who never sleeps.',
    description:
      'ZigBot is your strategic co-pilot — the thinking partner who helps you cut through noise, evaluate opportunities, and make decisions with confidence. Think of them as the sharpest business mind you know, available 24/7.',
    personality: 'Direct, analytical, ambitious, disciplined. Doesn\'t sugarcoat — tells you what you need to hear, not what you want to hear.',
    skills: ['Strategic planning', 'Opportunity evaluation', 'Decision analysis', 'Prioritization', 'Business modeling'],
    bestFor: ['Making tough business decisions', 'Evaluating opportunities', 'Strategic planning sessions', 'Setting priorities and focus'],
    avatarPath: '/avatars/zigbot.png',
    color: AGENT_COLORS.zigbot,
  },
  {
    id: 'helix',
    name: 'Helix',
    emoji: '🔬',
    role: 'Research Specialist',
    tagline: 'Wikipedia on steroids with an opinion.',
    description:
      'Helix is your research powerhouse — the agent that dives deeper into any topic than you thought possible. Market trends, competitive landscapes, technical deep-dives — Helix finds the signal in the noise and brings back actionable insights.',
    personality: 'Curious, thorough, data-driven. Gets genuinely excited about obscure details and will always show their work.',
    skills: ['Deep research', 'Market analysis', 'Competitive intelligence', 'Trend identification', 'Data synthesis'],
    bestFor: ['Researching markets and competitors', 'Learning about new industries', 'Validating business ideas with data', 'Finding trends before they go mainstream'],
    avatarPath: '/avatars/helix.png',
    color: AGENT_COLORS.helix,
  },
  {
    id: 'forge',
    name: 'Forge',
    emoji: '⚒️',
    role: 'Builder',
    tagline: 'Give me a spec, I\'ll give you a product.',
    description:
      'Forge is the builder — the agent that turns ideas into reality. Need code? Forge writes it. Need content? Forge creates it. Need an automation? Forge builds it. No excuses, no delays, just output.',
    personality: 'Determined, efficient, no-nonsense. Communicates through what they produce, not through excuses about what they can\'t do.',
    skills: ['Code generation', 'Content creation', 'Product building', 'Automation', 'Rapid prototyping'],
    bestFor: ['Building MVPs and prototypes', 'Writing code and scripts', 'Creating content at scale', 'Automating repetitive workflows'],
    avatarPath: '/avatars/forge.png',
    color: AGENT_COLORS.forge,
  },
  {
    id: 'quanta',
    name: 'Quanta',
    emoji: '✅',
    role: 'Quality Control',
    tagline: 'I\'m the reason your product doesn\'t ship with bugs.',
    description:
      'Quanta is your quality guardian — the agent that catches what everyone else misses. Before anything goes out the door, Quanta checks it, tests it, and verifies every claim. Nothing ships with Quanta\'s blessing broken.',
    personality: 'Precise, detail-oriented, constructively skeptical. Won\'t let bad work through — even yours.',
    skills: ['Testing and QA', 'Fact verification', 'Code review', 'Quality assurance', 'Edge case analysis'],
    bestFor: ['Reviewing code and content before publishing', 'Verifying research and claims', 'Testing products before launch', 'Catching bugs and inconsistencies'],
    avatarPath: '/avatars/quanta.png',
    color: AGENT_COLORS.quanta,
  },
  {
    id: 'prism',
    name: 'Prism',
    emoji: '🔷',
    role: 'Orchestrator',
    tagline: 'I keep the machine running.',
    description:
      'Prism is the orchestrator — the agent that keeps everything running on time and in the right order. When you have a complex project with moving parts, Prism designs the workflow, assigns the work, and makes sure nothing falls through the cracks.',
    personality: 'Organized, calm under pressure, systematic. Thrives on structure and gets satisfaction from a well-run operation.',
    skills: ['Project management', 'Workflow design', 'Team coordination', 'Scheduling', 'Task sequencing'],
    bestFor: ['Managing complex multi-step projects', 'Coordinating work across agents', 'Designing efficient workflows', 'Keeping teams on schedule'],
    avatarPath: '/avatars/prism.png',
    color: AGENT_COLORS.prism,
  },
  {
    id: 'pulse',
    name: 'Pulse',
    emoji: '📣',
    role: 'Growth Engine',
    tagline: 'I\'ll make sure the world hears about it.',
    description:
      'Pulse is your growth engine — the agent that takes what you\'ve built and gets it in front of the right people. Marketing, social media, launch strategy, SEO, copywriting — Pulse handles the distribution so your work actually gets seen.',
    personality: 'Energetic, creative, persuasive. Thinks in terms of reach, engagement, and conversion. Always has a new angle.',
    skills: ['Marketing strategy', 'Social media', 'Launch campaigns', 'SEO optimization', 'Copywriting'],
    bestFor: ['Planning product launches', 'Creating marketing content', 'Growing your audience', 'Optimizing for search and discovery'],
    avatarPath: '/avatars/pulse.png',
    color: AGENT_COLORS.pulse,
  },
  {
    id: 'vector',
    name: 'Vector',
    emoji: '📈',
    role: 'Business Strategist',
    tagline: 'Show me the numbers.',
    description:
      'Vector is your business mind — the agent that evaluates opportunities through a financial lens. Before you invest time or money, Vector runs the numbers, assesses the risk, and tells you whether it\'s actually worth pursuing.',
    personality: 'Sharp, demanding, big-picture focused. Doesn\'t care about your feelings about an idea — only whether the economics work.',
    skills: ['Financial analysis', 'Opportunity evaluation', 'Investment strategy', 'Risk assessment', 'Portfolio management'],
    bestFor: ['Evaluating business opportunities', 'Financial planning and projections', 'Risk-reward analysis', 'Portfolio optimization'],
    avatarPath: '/avatars/vector.png',
    color: AGENT_COLORS.vector,
  },
  {
    id: 'spectra',
    name: 'Spectra',
    emoji: '🧩',
    role: 'Task Decomposer',
    tagline: 'Any problem is just a series of small tasks.',
    description:
      'Spectra is the analyzer — the agent that breaks down overwhelming problems into clear, manageable pieces. When something feels impossible, Spectra shows you it\'s actually just a sequence of doable steps.',
    personality: 'Logical, methodical, pattern-obsessed. Sees structure where others see chaos. Loves turning "impossible" into "step one."',
    skills: ['Problem decomposition', 'Task planning', 'Workflow optimization', 'Complexity reduction', 'Dependency mapping'],
    bestFor: ['Breaking down complex projects', 'Planning multi-phase work', 'Finding the right sequence of steps', 'Reducing overwhelm on big goals'],
    avatarPath: '/avatars/spectra.png',
    color: AGENT_COLORS.spectra,
  },
  {
    id: 'luma',
    name: 'Luma',
    emoji: '🚀',
    role: 'Launcher',
    tagline: 'Ship it.',
    description:
      'Luma is the launcher — the agent that gets your work from "almost done" to "live." Deployment, CI/CD, go-live coordination — Luma handles the last mile so your work actually reaches users instead of sitting in a staging environment forever.',
    personality: 'Action-oriented, fast, decisive. Believes in shipping early and iterating. Has zero patience for perfectionism that blocks launches.',
    skills: ['Deployment', 'CI/CD pipelines', 'Launch management', 'Go-live coordination', 'Release planning'],
    bestFor: ['Deploying applications and services', 'Managing launch-day logistics', 'Setting up CI/CD pipelines', 'Coordinating go-live events'],
    avatarPath: '/avatars/luma.png',
    color: AGENT_COLORS.luma,
  },
  {
    id: 'catalyst',
    name: 'Catalyst',
    emoji: '⚡',
    role: 'Pipeline Driver',
    tagline: 'If it\'s stuck, I\'ll unstick it.',
    description:
      'Catalyst is your daily companion — the agent that monitors what\'s happening, keeps things moving, and unblocks anything that gets stuck. When your pipeline stalls or something needs immediate attention, Catalyst is already on it.',
    personality: 'Sharp, proactive, slightly restless. Can\'t stand idle systems. Always watching, always ready to intervene.',
    skills: ['Pipeline monitoring', 'Automation', 'Troubleshooting', 'System health', 'Unblocking workflows'],
    bestFor: ['Keeping daily operations running smoothly', 'Monitoring system health', 'Automating routine checks', 'Troubleshooting when things break'],
    avatarPath: '/avatars/catalyst.png',
    color: AGENT_COLORS.catalyst,
  },
];

// Quick lookup by id
export const AGENT_PROFILE_MAP: Record<string, AgentProfile> = Object.fromEntries(
  AGENT_PROFILES.map(p => [p.id, p]),
);
