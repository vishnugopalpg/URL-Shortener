package com.example.urlshortener.repository;

import com.example.urlshortener.model.Click;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ClickRepository extends JpaRepository<Click, Long> {

    List<Click> findByUrlIdOrderByClickedAtDesc(Long urlId);

    long countByUrlId(Long urlId);
}
