// src/context/auth-context.js
//
// Creates and exports the AuthContext object.
//
// WHY A SEPARATE FILE?
//   React's fast-refresh rule requires that files exporting components
//   export ONLY components. AuthContext is not a component — it is a
//   context object. Keeping it here lets AuthContext.jsx export only
//   the AuthProvider component, and hooks/useAuth.js export only the hook.
//   Each file has one responsibility.

import { createContext } from 'react';

// null default means any component calling useContext(AuthContext) outside
// a provider gets null — our useAuth hook catches this and throws a
// descriptive error instead of silently failing.
const AuthContext = createContext(null);

export default AuthContext;
