import { Router } from 'express';

const router = Router();

const templates = [
  {
    id: 'MINIMALIST',
    name: 'Minimalist',
    description: 'Clean, simple design with focus on content',
    preview: '/templates/minimalist.png',
  },
  {
    id: 'BOLD',
    name: 'Bold',
    description: 'Strong colors and large typography',
    preview: '/templates/bold.png',
  },
  {
    id: 'ELEGANT',
    name: 'Elegant',
    description: 'Refined, professional look with subtle details',
    preview: '/templates/elegant.png',
  },
  {
    id: 'CREATIVE',
    name: 'Creative',
    description: 'Playful, colorful layout for creatives',
    preview: '/templates/creative.png',
  },
];

// GET /api/templates
router.get('/', (_req, res) => {
  res.json(templates);
});

export default router;
