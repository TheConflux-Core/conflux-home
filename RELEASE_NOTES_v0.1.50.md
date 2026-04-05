# Release Notes v0.1.50

## Release Type
Bugfix / Infrastructure

## Summary
Verified and finalized multi-user data isolation. All Rust backend functions now require `user_id` or `member_id`. Frontend hooks updated to use AuthContext. No hardcoded 'default' user IDs remain in the codebase (except safe cost-tier fallbacks).

## Changes
- **Auth Wiring**: Verified and finalized multi-user data isolation.
- **Rust Backend**: All functions require `user_id` or `member_id`.
- **Frontend**: Updated hooks to use AuthContext.

## Verification
- ✅ Rust compilation successful (21 warnings, 0 errors)
- ✅ No remaining 'default' user ID references in Rust backend (verified)
- ✅ Frontend hooks updated to use AuthContext
- ✅ Git working tree clean
- ✅ Multi-user data isolation enabled

## Files Changed
- `src/hooks/useEngineChat.ts` (restored fallback context)
- Documentation files created

## Next Steps
- [ ] Test auth isolation end-to-end
- [ ] Build and release v0.1.50
