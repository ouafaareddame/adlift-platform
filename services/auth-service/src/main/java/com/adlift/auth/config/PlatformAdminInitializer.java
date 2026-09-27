package com.adlift.auth.config;

import com.adlift.auth.entity.Role;
import com.adlift.auth.entity.Tenant;
import com.adlift.auth.entity.TenantStatus;
import com.adlift.auth.entity.User;
import com.adlift.auth.repository.TenantRepository;
import com.adlift.auth.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Sans inscription publique, le premier compte direction (SUPER_ADMIN)
 * doit exister au démarrage : c'est lui qui ouvre ensuite les espaces clients.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class PlatformAdminInitializer implements ApplicationRunner {

    private final UserRepository userRepository;
    private final TenantRepository tenantRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${adlift.platform.name}")
    private String platformName;

    @Value("${adlift.platform.email}")
    private String platformEmail;

    @Value("${adlift.platform.admin-email}")
    private String adminEmail;

    @Value("${adlift.platform.admin-password}")
    private String adminPassword;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (userRepository.existsByRole(Role.SUPER_ADMIN)) {
            return;
        }
        if (userRepository.existsByEmail(adminEmail)) {
            log.warn("Compte direction non créé : l'email {} est déjà utilisé par un autre compte.", adminEmail);
            return;
        }

        Tenant existing = tenantRepository.findByName(platformName).orElse(null);
        if (existing != null && userRepository.existsByTenant_Id(existing.getId())) {
            log.warn("Compte direction non créé : l'espace « {} » appartient déjà à un client. "
                    + "Définissez ADLIFT_PLATFORM_NAME avec un autre nom.", platformName);
            return;
        }
        if (existing == null && tenantRepository.existsByEmail(platformEmail)) {
            log.warn("Compte direction non créé : l'email d'espace {} est déjà utilisé. "
                    + "Définissez ADLIFT_PLATFORM_EMAIL avec une autre adresse.", platformEmail);
            return;
        }

        Tenant platform = existing != null ? existing : tenantRepository.save(Tenant.builder()
                .name(platformName)
                .email(platformEmail)
                .status(TenantStatus.ACTIVE)
                .build());

        userRepository.save(User.builder()
                .tenant(platform)
                .email(adminEmail)
                .passwordHash(passwordEncoder.encode(adminPassword))
                .role(Role.SUPER_ADMIN)
                .isActive(true)
                .mustChangePassword(true)
                .build());

        log.info("Compte direction Adlift créé : {}", adminEmail);
    }
}
