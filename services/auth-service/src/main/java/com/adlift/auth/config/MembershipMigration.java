package com.adlift.auth.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Bases créées avant Membership : users portait tenant_id et role.
 * ddl-auto ne supprime jamais de colonne, et ces colonnes NOT NULL bloqueraient
 * la création de comptes ; on recopie donc chaque compte en accès, puis on les retire.
 * La désactivation d'un membre devient celle de son accès, pas de son compte.
 */
@Component
@Order(0)
@RequiredArgsConstructor
@Slf4j
public class MembershipMigration implements ApplicationRunner {

    private final JdbcTemplate jdbc;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        Integer legacy = jdbc.queryForObject("""
                SELECT count(*) FROM information_schema.columns
                WHERE table_name = 'users' AND column_name = 'tenant_id'
                """, Integer.class);
        if (legacy == null || legacy == 0) return;

        int copied = jdbc.update("""
                INSERT INTO memberships (id, user_id, tenant_id, role, is_active, created_at)
                SELECT gen_random_uuid(), u.id, u.tenant_id, u.role, u.is_active, u.created_at
                FROM users u
                WHERE NOT EXISTS (SELECT 1 FROM memberships m WHERE m.user_id = u.id AND m.tenant_id = u.tenant_id)
                """);
        jdbc.execute("UPDATE users SET is_active = true");
        jdbc.execute("ALTER TABLE users DROP COLUMN tenant_id");
        jdbc.execute("ALTER TABLE users DROP COLUMN IF EXISTS role");
        log.info("Migration vers les accès multi-espaces : {} accès créé(s)", copied);
    }
}
