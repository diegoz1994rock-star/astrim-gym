package com.astrimgym.cliente.ui.nav

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.foundation.background
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.BarChart
import androidx.compose.material.icons.rounded.CalendarMonth
import androidx.compose.material.icons.rounded.FitnessCenter
import androidx.compose.material.icons.rounded.Home
import androidx.compose.material.icons.rounded.Person
import androidx.compose.material.icons.rounded.Restaurant
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.astrimgym.cliente.data.AppContainer
import com.astrimgym.cliente.ui.components.pressableNoRipple
import com.astrimgym.cliente.ui.components.rememberHaptics
import com.astrimgym.cliente.ui.agenda.AgendaScreen
import com.astrimgym.cliente.ui.home.HomeScreen
import com.astrimgym.cliente.ui.mealplan.MealPlanChooserScreen
import com.astrimgym.cliente.ui.mealplan.MealPlanDetailScreen
import com.astrimgym.cliente.ui.mealplan.MealPlanListScreen
import com.astrimgym.cliente.ui.profile.ProfileScreen
import com.astrimgym.cliente.ui.progress.ProgressScreen
import com.astrimgym.cliente.ui.routine.ExerciseDetailScreen
import com.astrimgym.cliente.ui.routine.RoutineDetailScreen
import com.astrimgym.cliente.ui.routine.RoutineListScreen
import com.astrimgym.cliente.ui.theme.LocalAstrimAccent
import com.astrimgym.cliente.ui.workout.WorkoutModeScreen

private enum class Tab(
    val route: String,
    val label: String,
    val icon: ImageVector,
) {
    HOME("home", "Inicio", Icons.Rounded.Home),
    ROUTINE("routine", "Rutina", Icons.Rounded.FitnessCenter),
    MEALPLAN("mealplan", "Alimentación", Icons.Rounded.Restaurant),
    CALENDAR("calendar", "Clases", Icons.Rounded.CalendarMonth),
    PROGRESS("progress", "Progreso", Icons.Rounded.BarChart),
    PROFILE("profile", "Perfil", Icons.Rounded.Person),
}

private val TAB_ROUTES = Tab.entries.map { it.route }.toSet()

/**
 * Un solo NavController. La barra inferior solo aparece en las 5 tabs; las
 * pantallas de detalle y el Modo Entrenamiento son de pantalla completa.
 */
@Composable
fun AppNavigation(
    container: AppContainer,
    onAccentColorResolved: (Color) -> Unit,
) {
    val navController: NavHostController = rememberNavController()
    val backStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = backStackEntry?.destination?.route

    Box(Modifier.fillMaxWidth()) {
        NavHost(
            navController = navController,
            startDestination = Tab.HOME.route,
        ) {
            composable(Tab.HOME.route) {
                HomeScreen(
                    homeRepository = container.homeRepository,
                    onAccentColorResolved = onAccentColorResolved,
                    onStartWorkout = { routineId -> navController.navigate("workout/$routineId") },
                    onOpenRoutines = { navController.navigate(Tab.ROUTINE.route) },
                )
            }
            composable(Tab.ROUTINE.route) {
                RoutineListScreen(
                    routineRepository = container.routineRepository,
                    onOpenRoutine = { routineId -> navController.navigate("routine/$routineId") },
                )
            }
            composable(Tab.MEALPLAN.route) {
                MealPlanChooserScreen(
                    mealPlanRepository = container.mealPlanRepository,
                    onOpenPlan = { mealPlanId -> navController.navigate("mealplan/$mealPlanId") },
                )
            }
            composable(Tab.CALENDAR.route) {
                AgendaScreen(agendaRepository = container.agendaRepository)
            }
            composable(Tab.PROGRESS.route) {
                ProgressScreen(progressRepository = container.progressRepository)
            }
            composable(Tab.PROFILE.route) {
                ProfileScreen(
                    profileRepository = container.profileRepository,
                    onLogout = { container.authRepository.logout() },
                )
            }

            composable("routine/{routineId}") { entry ->
                val routineId = entry.arguments?.getString("routineId").orEmpty()
                RoutineDetailScreen(
                    routineRepository = container.routineRepository,
                    routineId = routineId,
                    onBack = { navController.popBackStack() },
                    onOpenExercise = { exerciseId ->
                        navController.navigate("exercise/$routineId/$exerciseId")
                    },
                    onStartWorkout = { navController.navigate("workout/$routineId") },
                )
            }
            composable("exercise/{routineId}/{exerciseId}") { entry ->
                ExerciseDetailScreen(
                    routineRepository = container.routineRepository,
                    routineId = entry.arguments?.getString("routineId").orEmpty(),
                    exerciseId = entry.arguments?.getString("exerciseId").orEmpty(),
                    onBack = { navController.popBackStack() },
                )
            }
            composable("mealplan/{planId}") { entry ->
                val planId = entry.arguments?.getString("planId").orEmpty()
                MealPlanListScreen(
                    mealPlanRepository = container.mealPlanRepository,
                    mealLogRepository = container.mealLogRepository,
                    mealPlanId = planId,
                    onBack = { navController.popBackStack() },
                    onAddFood = { mealType -> navController.navigate("mealplan/$planId/add/$mealType") },
                    onEditEntry = { entryId -> navController.navigate("mealplan/$planId/edit/$entryId") },
                )
            }
            composable("mealplan/{planId}/add/{mealType}") { entry ->
                MealPlanDetailScreen(
                    mealPlanRepository = container.mealPlanRepository,
                    mealLogRepository = container.mealLogRepository,
                    mealPlanId = entry.arguments?.getString("planId").orEmpty(),
                    mealType = entry.arguments?.getString("mealType"),
                    entryId = null,
                    onDone = { navController.popBackStack() },
                )
            }
            composable("mealplan/{planId}/edit/{entryId}") { entry ->
                MealPlanDetailScreen(
                    mealPlanRepository = container.mealPlanRepository,
                    mealLogRepository = container.mealLogRepository,
                    mealPlanId = entry.arguments?.getString("planId").orEmpty(),
                    mealType = null,
                    entryId = entry.arguments?.getString("entryId"),
                    onDone = { navController.popBackStack() },
                )
            }
            composable("workout/{routineId}") { entry ->
                WorkoutModeScreen(
                    workoutRepository = container.workoutRepository,
                    routineId = entry.arguments?.getString("routineId").orEmpty(),
                    onExit = {
                        navController.popBackStack(Tab.HOME.route, inclusive = false)
                    },
                )
            }
        }

        if (currentRoute in TAB_ROUTES) {
            AstrimBottomBar(
                current = currentRoute,
                onSelect = { route ->
                    if (currentRoute != route) {
                        navController.navigate(route) {
                            popUpTo(navController.graph.startDestinationId) { saveState = true }
                            launchSingleTop = true
                            restoreState = true
                        }
                    }
                },
                modifier = Modifier.align(Alignment.BottomCenter),
            )
        }
    }
}

/**
 * Barra inferior propia. Fondo translúcido con separador hairline, ítem
 * activo con "píldora" de acento que se desliza (spring), ícono relleno +
 * etiqueta que aparece solo en el activo, y háptico al cambiar.
 */
@Composable
private fun AstrimBottomBar(
    current: String?,
    onSelect: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    val accent = LocalAstrimAccent.current
    val haptics = rememberHaptics()
    Column(modifier = modifier.fillMaxWidth()) {
        Box(
            Modifier
                .fillMaxWidth()
                .height(1.dp)
                .background(MaterialTheme.colorScheme.outlineVariant),
        )
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .background(MaterialTheme.colorScheme.background)
                .navigationBarsPadding()
                .padding(horizontal = 8.dp, vertical = 8.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Tab.entries.forEach { tab ->
                val selected = current == tab.route
                val interaction = remember { MutableInteractionSource() }
                val bg by animateColorAsState(
                    if (selected) accent.soft else Color.Transparent,
                    label = "navBg",
                )
                val tint by animateColorAsState(
                    if (selected) accent.base else MaterialTheme.colorScheme.onSurfaceVariant,
                    label = "navTint",
                )
                val iconSize by animateDpAsState(
                    if (selected) 24.dp else 23.dp,
                    animationSpec = spring(dampingRatio = 0.4f, stiffness = 700f),
                    label = "navIcon",
                )
                Row(
                    modifier = Modifier
                        .clip(RoundedCornerShape(50))
                        .background(bg)
                        .pressableNoRipple(interaction = interaction) {
                            if (!selected) haptics.tick()
                            onSelect(tab.route)
                        }
                        .padding(horizontal = if (selected) 16.dp else 14.dp, vertical = 10.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Icon(
                        tab.icon,
                        contentDescription = tab.label,
                        tint = tint,
                        modifier = Modifier.size(iconSize),
                    )
                    val labelWidth by animateFloatAsState(
                        if (selected) 1f else 0f, label = "navLabel",
                    )
                    if (labelWidth > 0.01f) {
                        Text(
                            tab.label,
                            style = MaterialTheme.typography.labelLarge,
                            color = tint,
                            modifier = Modifier
                                .padding(start = (6 * labelWidth).dp)
                                .then(Modifier),
                        )
                    }
                }
            }
        }
    }
}
