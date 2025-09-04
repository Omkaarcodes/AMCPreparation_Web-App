// import { supabase } from '../../client/src/pages/supabase-client';
// class LevelService {
//   private levelsCache: Level[] = [];
//   private lastCacheUpdate: Date | null = null;
  
//   async getLevels(forceRefresh = false): Promise<Level[]> {
//     // Check if cache is fresh (< 1 hour old)
//     if (!forceRefresh && this.isCacheFresh()) {
//       return this.levelsCache;
//     }
    
//     // Fetch from Supabase
//     const { data, error } = await supabase
//       .from('levels')
//       .select('*')
//       .order('level_number');
      
//     if (!error) {
//       this.levelsCache = data;
//       this.lastCacheUpdate = new Date();
//     }
    
//     return this.levelsCache;
//   }
  
//   async calculateUserLevel(totalXp: number): Promise<Level> {
//     const levels = await this.getLevels();
//     return levels.reverse().find(level => totalXp >= level.total_xp) || levels[0];
//   }
// }