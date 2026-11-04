<?php

namespace App\Http\Middleware;

use App\Models\Activity;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Refuses a change to an ARCHIVED activity or to its picture/attachments with the
 * same 409 `activity_archived` answer the activity controller uses. It reads the
 * activity from the route ({activity}); attachment routes are scoped to their
 * parent activity, so an attachment id is checked through its activity too.
 * It must run after authentication and the role check (route middleware does).
 */
class EnsureActivityNotArchived
{
    public function handle(Request $request, Closure $next): Response
    {
        $activity = $request->route('activity');

        if ($activity instanceof Activity && $activity->archived_at !== null) {
            return response()->json([
                'message' => 'This activity is archived. Restore it first.',
                'code' => 'activity_archived',
            ], 409);
        }

        return $next($request);
    }
}
