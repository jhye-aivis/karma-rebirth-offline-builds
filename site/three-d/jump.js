/* KARMA Wave21 — deterministic grounded vertical movement for existing WebGL2.
 * Floors are y=0. Current maps have 2D solid wall footprints but no traversable platforms.
 * The player's XZ wall collision remains with KarmaMaps3D.walk.
 */
(function(root){"use strict";
 const JUMP_VELOCITY=5.4,GRAVITY=14.4,MAX_HEIGHT=1.2;
 function reset(p){p.jumpY=0;p.jumpVY=0;p.grounded=true;p.jumpCount=p.jumpCount||0;p.landings=p.landings||0;return p;}
 function jump(p){if(!p||!p.grounded||p.hp<=0)return false;p.jumpVY=JUMP_VELOCITY;p.grounded=false;p.jumpCount=(p.jumpCount||0)+1;return true;}
 function step(p,dt){
  if(!p)return 0;
  if(p.hp<=0){reset(p);return 0;}
  if(p.grounded){p.jumpY=0;p.jumpVY=0;return 0;}
  dt=Math.min(.07,Math.max(0,Number(dt)||0));
  const next=(p.jumpY||0)+(p.jumpVY||0)*dt-.5*GRAVITY*dt*dt;
  p.jumpVY-=GRAVITY*dt;
  if(next<=0&&p.jumpVY<=0){p.jumpY=0;p.jumpVY=0;p.grounded=true;p.landings=(p.landings||0)+1;}
  else p.jumpY=Math.min(MAX_HEIGHT,Math.max(0,next));
  return p.jumpY;
 }
 root.KarmaJump={reset,jump,step,JUMP_VELOCITY,GRAVITY,MAX_HEIGHT};
})(globalThis);
