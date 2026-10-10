package com.astrimgym.cliente.ui.nav

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material.icons.outlined.FitnessCenter
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.Insights
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material.icons.outlined.Restaurant
import androidx.compose.material.icons.rounded.CalendarMonth
import androidx.compose.material.icons.rounded.FitnessCenter
import androidx.compose.material.icons.rounded.Home
import androidx.compose.material.icons.rounded.Insights
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
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.astrimgym.cliente.data.AppContainer
import com.astrimgym.cliente.ui.agenda.AgendaScreen
import com.astrimgym.cliente.ui.components.pressableNoRipple
import com.astrimgym.cliente.ui.components.rememberHaptics
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
import com.astrimgym.cliente.ui.theme.Motion
import com.astrimgym.cliente.ui.theme.TextTertiary
import com.astrimgym.cliente.ui.workout.WorkoutModeScreen

private enum class Tab(
    val route: String,
    val label: String,
    val icon: ImageVector,
    val selectedIcon: ImageVector,
) {
    HOME("home", "Inicio", Icons.Outlined.Home, Icons.Rounded.Home),
    ROUTINE("routine", "Rutina", Icons.Outlined.FitnessCenter, Icons.Rounded.FitnessCenter),
    MEALPLAN("mealplan", "Nutrición", Icons.Outlined.Restaurant, Icons.Rounded.Restaurant),
    CALENDAR("calendar", "Clases", Icons.Outlined.CalendarMonth, Icons.Rounded.CalendarMonth),
    PROGRESS("progress", "Progreso", Icons.Outlined.Insights, Icons.Rounded.Insights),
    PROFILE("profile", "Perfil", Icons.Outlined.Person, Icons.Rounded.Person),
}

private val TAB_ROUTES = Tab.entries.map { it.route }.toSet()

/**
 * Un solo NavController. La barra inferior solo aparece en las 5 tabs; las
 * pantallas de detalle y el Modo Entrenamiento son de pantalla completa.
 */
@Composable
fun AppNavigation(container: AppContainer) {
    val navController: NavHostController = rememberNavController()
    val backStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = backStackEntry?.destination?.route

    fun goToTab(route: String) {
        navController.navigate(route) {
            popUpTo(navController.graph.startDestinationId) { saveState = true }
            launchSingleTop = true
            restoreState = true
        }
    }

    Box(Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
        NavHost(
            navController = navController,
            startDestination = Tab.HOME.route,
            enterTransition = { fadeIn(tween(Motion.SCREEN)) },
            exitTransition = { fadeOut(tween(Motion.SCREEN / 2)) },
            popEnterTransition = { fadeIn(tween(Motion.SCREEN)) },
            popExitTransition = { fadeOut(tween(Motion.SCREEN / 2)) },
        ) {
            composable(Tab.HOME.route) {
                HomeScreen(
                    homeRepository = container.homeRepository,
                    onStartWorkout = { routineId -> navController.navigate("workout/$routineId") },
                    onOpenRoutines = { goToTab(Tab.ROUTINE.route) },
                    onOpenClasses = { goToTab(Tab.CALENDAR.route) },
                    onOpenProgress = { goToTab(Tab.PROGRESS.route) },
                    onOpenMealPlan = { goToTab(Tab.MEALPLAN.route) },
                    onOpenProfile = { goToTab(Tab.PROFILE.route) },
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
                onSelect = { route -> if (currentRoute != route) goToTab(route) },
                modifier = Modifier.align(Alignment.BottomCenter),
            )
        }
    }
}

/**
 * Barra inferior ASTRIM: fondo oscuro sólido con separador fino, seis
 * destinos de ancho fijo (nada se desplaza al cambiar), ícono + etiqueta
 * siempre visibles. Activo = ícono relleno + etiqueta en lima + indicador
 * corto arriba. Respeta la barra de navegación del sistema.
 */
@Composable
private fun AstrimBottomBar(
    current: String?,
    onSelect: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    val accent = LocalAstrimAccent.current
    val haptics = rememberHaptics()
    Column(
        modifier = modifier
            .fillMaxWidth()
            .background(MaterialTheme.colorScheme.background),
    ) {
        Box(
            Modifier
                .fillMaxWidth()
                .height(1.dp)
                .background(MaterialTheme.colorScheme.outline),
        )
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .navigationBarsPadding()
                .padding(horizontal = 4.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Tab.entries.forEach { tab ->
                val selected = current == tab.route
                val interaction = remember { MutableInteractionSource() }
                val tint by animateColorAsState(
                    if (selected) accent.base else TextTertiary,
                    animationSpec = tween(Motion.CARD),
                    label = "navTint",
                )
                val indicator by animateColorAsState(
                    if (selected) accent.base else Color.Transparent,
                    animationSpec = tween(Motion.CARD),
                    label = "navIndicator",
                )
                Column(
                    modifier = Modifier
                        .weight(1f)
                        .heightIn(min = 64.dp)
                        .pressableNoRipple(interaction = interaction) {
                            if (!selected) haptics.tick()
                            onSelect(tab.route)
                        }
                        .semantics {
                            role = Role.Tab
                            this.selected = selected
                        },
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    Box(
                        Modifier
                            .width(24.dp)
                            .height(3.dp)
                            .clip(RoundedCornerShape(bottomStart = 3.dp, bottomEnd = 3.dp))
                            .background(indicator),
                    )
                    Spacer(Modifier.height(9.dp))
                    Icon(
                        if (selected) tab.selectedIcon else tab.icon,
                        contentDescription = null,
                        tint = tint,
                        modifier = Modifier.size(24.dp),
                    )
                    Spacer(Modifier.height(4.dp))
                    Text(
                        tab.label,
                        style = MaterialTheme.typography.labelSmall.copy(letterSpacing = 0.sp, fontSize = 11.sp),
                        color = tint,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                    Spacer(Modifier.height(8.dp))
                }
            }
        }
    }
}
