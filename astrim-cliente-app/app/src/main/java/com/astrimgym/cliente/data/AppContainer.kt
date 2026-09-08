package com.astrimgym.cliente.data

import com.astrimgym.cliente.data.repository.AgendaRepository
import com.astrimgym.cliente.data.repository.AuthRepository
import com.astrimgym.cliente.data.repository.HomeRepository
import com.astrimgym.cliente.data.repository.MealLogRepository
import com.astrimgym.cliente.data.repository.MealPlanRepository
import com.astrimgym.cliente.data.repository.ProfileRepository
import com.astrimgym.cliente.data.repository.ProgressRepository
import com.astrimgym.cliente.data.repository.RoutineRepository
import com.astrimgym.cliente.data.repository.WorkoutRepository
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.ktx.auth
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.firestoreSettings
import com.google.firebase.firestore.ktx.firestore
import com.google.firebase.firestore.persistentCacheSettings
import com.google.firebase.ktx.Firebase

/**
 * DI manual (sin Hilt por ahora): un contenedor con Firebase Auth,
 * Firestore (con cache persistente para offline) y los repositorios.
 * Cambiar a Hilt más adelante es un refactor local a este archivo.
 */
interface AppContainer {
    val authRepository: AuthRepository
    val homeRepository: HomeRepository
    val routineRepository: RoutineRepository
    val mealPlanRepository: MealPlanRepository
    val mealLogRepository: MealLogRepository
    val profileRepository: ProfileRepository
    val workoutRepository: WorkoutRepository
    val agendaRepository: AgendaRepository
    val progressRepository: ProgressRepository
    val clientSession: ClientSession
}

class DefaultAppContainer : AppContainer {
    private val auth: FirebaseAuth = Firebase.auth

    private val db: FirebaseFirestore = Firebase.firestore.apply {
        firestoreSettings = firestoreSettings {
            setLocalCacheSettings(persistentCacheSettings {})
        }
    }

    override val clientSession = ClientSession(auth, db)
    override val authRepository = AuthRepository(auth)
    override val homeRepository = HomeRepository(db, clientSession)
    override val routineRepository = RoutineRepository(db, clientSession)
    override val mealPlanRepository = MealPlanRepository(db, clientSession)
    override val mealLogRepository = MealLogRepository(db, clientSession)
    override val profileRepository = ProfileRepository(db, clientSession)
    override val workoutRepository = WorkoutRepository(db, clientSession, routineRepository)
    override val agendaRepository = AgendaRepository(db, clientSession)
    override val progressRepository = ProgressRepository(db, clientSession)
}
