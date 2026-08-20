import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || '',
  import.meta.env.VITE_SUPABASE_ANON_KEY || ''
)

// import { createClient } from '@supabase/supabase-js'
// import firebase from 'firebase/compat/app'
// import 'firebase/compat/auth'

// const supabase = createClient('https://<supabase-project>.supabase.co', 'SUPABASE_ANON_KEY', {
//   accessToken: async () => {
//     return (await firebase.auth().currentUser?.getIdToken(/* forceRefresh */ false)) ?? null
//   },
// })
