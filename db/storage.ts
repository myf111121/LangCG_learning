import {env} from 'cloudflare:workers';
export function storage(){if(!env.DB)throw new Error('Learning database unavailable');return env.DB}
